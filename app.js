import { renderProduct } from "./components/productCard.js";

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const referralSource = getQueryParam("ref");
if (referralSource) {
  gtag("event", "custom_referral", {
    referral_source: referralSource,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  let products = [];
  let currentPage = 1;
  let itemsPerPage = 10;
  let searchQuery = "";

  const stickyHeader = document.querySelector(".sticky-header");
  const setHeaderOffset = () => {
    document.documentElement.style.setProperty(
      "--header-h",
      stickyHeader.offsetHeight + "px"
    );
  };
  setHeaderOffset();
  window.addEventListener("resize", setHeaderOffset);

  const searchInput = document.getElementById("search");
  searchInput.focus();
  const perPageSelect = document.getElementById("items-per-page");
  const paginationContainer = document.getElementById("pagination");
  const listContainer = document.getElementById("product-list");
  const toggleBtn = document.getElementById("themeToggle");
  const root = document.documentElement;

  const currentTheme = localStorage.getItem("theme") || "dark";
  root.setAttribute("data-theme", currentTheme);
  setIcon(currentTheme);

  toggleBtn.addEventListener("click", () => {
    const newTheme =
      root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    setIcon(newTheme);
  });

  function setIcon(theme) {
    toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  fetch("./ProductList.json")
    .then((res) => res.json())
    .then((data) => {
      products = data;
      render();
    });

  searchInput.addEventListener(
    "input",
    debounce((e) => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      render();
    }, 300)
  );

  perPageSelect.addEventListener("change", (e) => {
    itemsPerPage = Number(e.target.value);
    currentPage = 1;
    render();
  });

  function performSearch(query) {
    if (!query) {
      return products;
    }

    const lowerCaseQuery = query.toLowerCase();
    const queryWords = lowerCaseQuery.split(/\s+/).filter(Boolean);

    let exactMatches = [];
    let startsWithMatches = [];
    let wordMatches = [];
    let containsMatches = [];

    products.forEach(product => {
      const genericName = product.GenericName.toLowerCase();
      const drugCode = String(product.DrugCode).toLowerCase();
      const groupName = product.GroupName.toLowerCase();

      // Tier 1: Exact Match
      if (drugCode === lowerCaseQuery || genericName === lowerCaseQuery) {
        exactMatches.push(product);
        return;
      }
      
      // Tier 2: Starts With
      if (genericName.startsWith(lowerCaseQuery) || drugCode.startsWith(lowerCaseQuery)) {
        startsWithMatches.push(product);
        return;
      }

      // Tier 3: Words Match
      if (queryWords.every(word => 
          genericName.split(/\s+/).includes(word) ||
          groupName.split(/\s+/).includes(word)
        )) {
        wordMatches.push(product);
        return;
      }

      // Tier 4: Substring/Contains Match (Fallback)
      if (genericName.includes(lowerCaseQuery) || drugCode.includes(lowerCaseQuery) || groupName.includes(lowerCaseQuery)) {
        containsMatches.push(product);
      }
    });

    // Combine and deduplicate results, prioritizing tiers
    const combinedResults = [
      ...new Set([...exactMatches, ...startsWithMatches, ...wordMatches, ...containsMatches])
    ];

    return combinedResults;
  }

  function render() {
    const filtered = performSearch(searchQuery);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const currentItems = filtered.slice(start, start + itemsPerPage);

    if (currentItems.length === 0) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <path d="M15 3h6v6"></path>
              <path d="M10 14L21 3"></path>
            </svg>
            <h3>No results found</h3>
            <p>Try searching for a different medicine or group.</p>
          </td>
        </tr>
      `;
    } else {
      listContainer.innerHTML = currentItems
        .map((p) => renderProduct(p, searchQuery))
        .join("");
    }
    
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    let pagesHtml = "";
    const visiblePages = Array.from({
      length: totalPages
    }, (_, i) => i + 1).filter(
      (page) =>
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
    );

    visiblePages.forEach((page, idx) => {
      const prev = visiblePages[idx - 1];
      if (prev && page - prev > 1) {
        pagesHtml += `<span class="ellipsis">...</span>`;
      }

      pagesHtml += `
        <button 
          class="pagination-btn ${currentPage === page ? "active" : ""}" 
          onclick="goToPage(${page})"
        >
          ${page}
        </button>
      `;
    });

    paginationContainer.innerHTML = `
      <div class="pagination-wrapper">
        <button 
          ${currentPage === 1 ? "disabled" : ""} 
          onclick="goToPage(${currentPage - 1})" 
          class="pagination-btn"
        >
          Prev
        </button>
        ${pagesHtml}
        <button 
          ${currentPage === totalPages ? "disabled" : ""} 
          onclick="goToPage(${currentPage + 1})" 
          class="pagination-btn"
        >
          Next
        </button>
      </div>
    `;
  }

  window.goToPage = function (page) {
    currentPage = page;
    render();
  };

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }
});