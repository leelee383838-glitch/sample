/**
 * 연관 검색어 추출 - UI 로직
 * 데이터는 services/keywordService.js (병렬 키워드 확장)
 */

(function () {
  const baseKeywordEl = document.getElementById("baseKeyword");
  const btnSearch = document.getElementById("btnSearch");
  const resultCountEl = document.getElementById("resultCount");
  const sortByEl = document.getElementById("sortBy");
  const resultSection = document.getElementById("resultSection");
  const emptyState = document.getElementById("emptyState");
  const resultGroupsEl = document.getElementById("resultGroups");
  const btnCopyAll = document.getElementById("btnCopyAll");
  const btnDownloadCsv = document.getElementById("btnDownloadCsv");

  const EXPANSION_IDS = ["expansion1", "expansion2", "expansion3", "expansion4", "expansion5"];

  /** @type {{ groups: Array<{ label: string, keywords: Array<{ keyword: string, relevance: number, searchVolume: number }> }> } */
  let currentResult = { groups: [] };

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  function renderIcons(container) {
    if (typeof lucide === "undefined") return;
    if (container) lucide.createIcons({ root: container });
    else lucide.createIcons();
  }

  function getExpansionTerms() {
    return EXPANSION_IDS.map((id) => document.getElementById(id).value.trim()).filter(Boolean);
  }

  async function runSearch() {
    const base = baseKeywordEl.value.trim();
    if (!base) {
      baseKeywordEl.focus();
      return;
    }

    const count = Number(resultCountEl.value) || 100;
    const expansionTerms = getExpansionTerms();

    btnSearch.disabled = true;
    btnSearch.textContent = "생성 중…";

    try {
      const result = await window.KeywordService.getRelatedKeywordsParallel(
        base,
        count,
        expansionTerms
      );
      const sortBy = sortByEl.value;
      result.groups.forEach((g) => {
        g.keywords = window.KeywordService.sortKeywords(g.keywords, sortBy);
      });
      currentResult = result;
      emptyState.hidden = true;
      resultSection.hidden = false;
      renderResults();
    } catch (e) {
      console.error(e);
      alert("연관 키워드를 불러오는 중 오류가 났습니다.");
    } finally {
      btnSearch.disabled = false;
      btnSearch.innerHTML =
        '<span class="icon" data-lucide="sparkles"></span> 연관 키워드 생성';
      renderIcons(btnSearch);
    }
  }

  function getCurrentView() {
    const tab = document.querySelector(".view-tabs .tab.active");
    return tab ? tab.dataset.view : "list";
  }

  function renderResults() {
    const view = getCurrentView();
    resultGroupsEl.innerHTML = currentResult.groups
      .map((group, idx) => {
        const listHtml = renderGroupList(group.keywords);
        const tagsHtml = renderGroupTags(group.keywords);
        return `
          <div class="result-group" data-group-idx="${idx}">
            <div class="result-group-header">
              <div class="result-group-title">
                <span class="icon" data-lucide="folder-output"></span>
                ${escapeHtml(group.label)}
              </div>
              <div class="result-group-actions">
                <button type="button" class="btn btn-secondary btn-sm btn-copy-group" data-group-idx="${idx}" title="이 그룹 복사">
                  <span class="icon" data-lucide="copy"></span>
                  복사
                </button>
                <button type="button" class="btn btn-primary btn-sm btn-csv-group" data-group-idx="${idx}" title="이 그룹 CSV">
                  <span class="icon" data-lucide="download"></span>
                  CSV
                </button>
              </div>
            </div>
            <div class="result-list-wrap" ${view !== "list" ? "hidden" : ""}>
              <ul class="result-list">${listHtml}</ul>
            </div>
            <div class="result-tags-wrap" ${view !== "tags" ? "hidden" : ""}>
              <div class="result-tags">${tagsHtml}</div>
            </div>
          </div>
        `;
      })
      .join("");

    resultGroupsEl.querySelectorAll(".btn-copy-item").forEach((btn) => {
      btn.addEventListener("click", () => copyToClipboard(btn.dataset.keyword));
    });
    resultGroupsEl.querySelectorAll(".btn-copy-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.groupIdx);
        const kw = currentResult.groups[idx].keywords.map((k) => k.keyword).join("\n");
        copyToClipboard(kw);
      });
    });
    resultGroupsEl.querySelectorAll(".btn-csv-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.groupIdx);
        downloadGroupCsv(idx);
      });
    });
    renderIcons(resultGroupsEl);

    resultGroupsEl.querySelectorAll(".result-group").forEach((group) => {
      const listWrap = group.querySelector(".result-list-wrap");
      const tagsWrap = group.querySelector(".result-tags-wrap");
      listWrap.hidden = view !== "list";
      tagsWrap.hidden = view !== "tags";
    });
  }

  function downloadGroupCsv(groupIdx) {
    const g = currentResult.groups[groupIdx];
    if (!g || !g.keywords.length) return;
    const headers = "키워드,연관도,검색량";
    const rows = g.keywords.map(
      (k) => `${escapeCsv(k.keyword)},${(k.relevance * 100).toFixed(1)},${k.searchVolume}`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `연관키워드_${baseKeywordEl.value.trim() || "키워드"}_${g.label}_${formatDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`"${g.label}" 그룹 CSV 다운로드되었습니다.`);
  }

  function renderGroupList(keywords) {
    return keywords
      .map(
        (item) => `
        <li>
          <span class="keyword-text">${escapeHtml(item.keyword)}</span>
          <span class="meta">연관도 ${(item.relevance * 100).toFixed(0)}% · 검색량 ${item.searchVolume.toLocaleString()}</span>
          <button type="button" class="btn-copy-item" data-keyword="${escapeAttr(item.keyword)}" title="복사">
            <span class="icon" data-lucide="copy"></span>
          </button>
        </li>
      `
      )
      .join("");
  }

  function renderGroupTags(keywords) {
    return keywords
      .map(
        (item) => `
        <span class="tag-item">
          <span class="tag-keyword">${escapeHtml(item.keyword)}</span>
          <button type="button" class="btn-copy-item" data-keyword="${escapeAttr(item.keyword)}" title="복사">
            <span class="icon" data-lucide="copy"></span>
          </button>
        </span>
      `
      )
      .join("");
  }

  document.querySelectorAll(".view-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".view-tabs .tab").forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      const view = this.dataset.view;
      resultGroupsEl.querySelectorAll(".result-list-wrap").forEach((el) => {
        el.hidden = view !== "list";
      });
      resultGroupsEl.querySelectorAll(".result-tags-wrap").forEach((el) => {
        el.hidden = view !== "tags";
      });
    });
  });

  sortByEl.addEventListener("change", function () {
    if (currentResult.groups.length) {
      const sortBy = sortByEl.value;
      currentResult.groups.forEach((g) => {
        g.keywords = window.KeywordService.sortKeywords(g.keywords, sortBy);
      });
      renderResults();
    }
  });

  function copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("클립보드에 복사되었습니다."))
      .catch(() => showToast("복사에 실패했습니다."));
  }

  function getAllKeywordsFlat() {
    return currentResult.groups.flatMap((g) => g.keywords);
  }

  function getFullKeywordText() {
    return getAllKeywordsFlat()
      .map((k) => k.keyword)
      .join("\n");
  }

  btnCopyAll.addEventListener("click", function () {
    if (!getAllKeywordsFlat().length) return;
    copyToClipboard(getFullKeywordText());
  });

  function downloadCsv() {
    const flat = getAllKeywordsFlat();
    if (!flat.length) return;
    const headers = "그룹,키워드,연관도,검색량";
    const rows = currentResult.groups.flatMap((g) =>
      g.keywords.map(
        (k) =>
          `${escapeCsv(g.label)},${escapeCsv(k.keyword)},${(k.relevance * 100).toFixed(1)},${k.searchVolume}`
      )
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `연관키워드_${baseKeywordEl.value.trim() || "키워드"}_${formatDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV 파일이 다운로드되었습니다.");
  }

  btnDownloadCsv.addEventListener("click", downloadCsv);

  btnSearch.addEventListener("click", runSearch);
  baseKeywordEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") runSearch();
  });

  // 마이 페이지 모달
  const myPageModal = document.getElementById("myPageModal");
  const btnMyPage = document.getElementById("btnMyPage");
  const btnCloseMyPage = document.getElementById("btnCloseMyPage");
  const apiKeyNaver = document.getElementById("apiKeyNaver");
  const apiKeyOpenAI = document.getElementById("apiKeyOpenAI");
  const btnSaveApiKeys = document.getElementById("btnSaveApiKeys");

  if (btnMyPage) {
    btnMyPage.addEventListener("click", function (e) {
      e.preventDefault();
      const keys = window.ApiKeys || { naver: "", openai: "" };
      apiKeyNaver.value = keys.naver || "";
      apiKeyOpenAI.value = keys.openai || "";
      myPageModal.hidden = false;
      if (typeof lucide !== "undefined") lucide.createIcons();
    });
  }
  if (btnCloseMyPage) {
    btnCloseMyPage.addEventListener("click", () => { myPageModal.hidden = true; });
  }
  if (myPageModal) {
    myPageModal.addEventListener("click", (e) => {
      if (e.target === myPageModal) myPageModal.hidden = true;
    });
  }
  if (btnSaveApiKeys) {
    btnSaveApiKeys.addEventListener("click", function () {
      const keys = {
        naver: apiKeyNaver.value.trim(),
        openai: apiKeyOpenAI.value.trim(),
      };
      if (typeof window.saveApiKeys === "function") {
        window.saveApiKeys(keys);
      } else {
        try {
          localStorage.setItem("keyword_app_api_keys", JSON.stringify(keys));
          window.ApiKeys = keys;
        } catch (_) {}
      }
      showToast("API 키가 저장되었습니다.");
      myPageModal.hidden = true;
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeCsv(s) {
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function formatDate() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
      String(d.getHours()).padStart(2, "0"),
      String(d.getMinutes()).padStart(2, "0"),
    ].join("");
  }

  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toast.style.cssText =
      "position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--sky-dark);color:#fff;padding:0.5rem 1rem;border-radius:8px;font-size:0.9rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
})();
