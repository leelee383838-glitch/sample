/**
 * API 키 관리 (마이 페이지)
 * - localStorage에 저장, window.ApiKeys로 전역 노출
 * - keywordService.js에서 API 연동 시 사용
 */

const STORAGE_KEY = "keyword_app_api_keys";

function loadApiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { naver: "", openai: "" };
    const parsed = JSON.parse(raw);
    return {
      naver: String(parsed.naver || ""),
      openai: String(parsed.openai || ""),
    };
  } catch {
    return { naver: "", openai: "" };
  }
}

function saveApiKeys(keys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    window.ApiKeys = keys;
    return true;
  } catch {
    return false;
  }
}

// 초기 로드 및 전역 노출 (keywordService에서 API 연동 시 사용)
window.ApiKeys = loadApiKeys();
window.saveApiKeys = function (keys) {
  return saveApiKeys(keys);
};
