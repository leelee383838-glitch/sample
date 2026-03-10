/**
 * 연관 키워드 데이터 서비스
 * - 검색광고용: 의미 없는 키워드(쇼핑, 맛집 등) 필터링
 * - API 연동: getRelatedKeywords() 교체 → getRelatedKeywordsParallel()에서 사용
 * - API 키: window.ApiKeys (마이페이지에서 설정)
 */

/** 검색광고와 무관한 의미 없는 접미사 (배척) - 대출·기업 등과 조합 시 부적합 */
const MEANINGLESS_SUFFIXES = [
  "쇼핑", "맛집", "구매", "배송", "할인", "쿠폰", "몰", "사이트", "예약", "설치",
  "수리", "렌탈", "대여", "구매처", "판매", "제품", "상품", "업소", "주문",
];

/** 금융/대출/보험 등 검색광고에 적합한 접미사 */
const AD_RELEVANT_SUFFIXES = [
  "추천", "후기", "비교", "조건", "한도", "신청", "금리", "상환", "이자", "은행",
  "금융", "신용", "주택", "자동차", "기업", "개인", "전환", "상환방식", "대출",
  "비교사이트", "한도조회", "금리비교", "조건", "서비스", "업체", "가격",
];

/** 키워드가 의미 있는지 검사 (무관한 접미사 포함 시 false) */
function isMeaningfulKeyword(keyword) {
  const k = keyword.trim();
  if (!k || k.length < 2) return false;
  const hasBad = MEANINGLESS_SUFFIXES.some((s) => k.includes(s));
  return !hasBad;
}

/**
 * 단일 쿼리 연관 키워드 조회 (실제 API 연동 시 이 함수만 교체)
 * - 마이페이지에서 저장한 키: window.ApiKeys?.naver, window.ApiKeys?.openai
 * - 네이버: ApiKeys.naver → 네이버 검색광고 키워드 API 호출
 * - OpenAI: ApiKeys.openai → ChatGPT로 연관 키워드 생성 프롬프트 호출
 */
async function getRelatedKeywords(queryKeyword, count) {
  // TODO: if (window.ApiKeys?.naver) return await fetchNaverKeywords(queryKeyword, count);
  // TODO: if (window.ApiKeys?.openai) return await fetchOpenAIKeywords(queryKeyword, count);
  return generateDummyKeywords(queryKeyword, count);
}

/**
 * 병렬식 키워드 확장
 */
async function getRelatedKeywordsParallel(baseKeyword, totalCount, expansionTerms = []) {
  const terms = expansionTerms.filter((t) => String(t).trim()).slice(0, 5);
  const groupCount = 1 + terms.length;
  const perGroupCount = Math.max(10, Math.ceil(totalCount / groupCount));

  const base = baseKeyword.trim() || "키워드";
  const queries = [{ label: "기본", query: base }];
  terms.forEach((t) => {
    const exp = String(t).trim();
    if (exp) queries.push({ label: exp, query: `${base} ${exp}` });
  });

  const results = await Promise.all(
    queries.map(({ label, query }) =>
      getRelatedKeywords(query, perGroupCount).then((keywords) => ({ label, keywords }))
    )
  );

  return { groups: results };
}

/**
 * 더미 데이터 생성 - 검색광고용 의미 있는 키워드만
 */
function generateDummyKeywords(queryKeyword, count) {
  const base = queryKeyword.trim() || "키워드";
  const seeds = [
    ...AD_RELEVANT_SUFFIXES.map((s) => `${base} ${s}`),
    ...AD_RELEVANT_SUFFIXES.map((s) => `${s} ${base}`),
    `저렴한 ${base}`, `최저가 ${base}`, `인기 ${base}`, `베스트 ${base}`,
  ].filter((k) => isMeaningfulKeyword(k));

  const result = [];
  const used = new Set();

  for (let i = 0; i < seeds.length && result.length < count; i++) {
    const keyword = seeds[i];
    if (used.has(keyword) || !isMeaningfulKeyword(keyword)) continue;
    used.add(keyword);
    result.push({
      keyword,
      relevance: 0.5 + Math.random() * 0.5,
      searchVolume: Math.floor(100 + Math.random() * 9900),
    });
  }

  // 부족하면 유사 패턴 (의미 있는 것만)
  const extra = ["비교", "추천", "조건", "한도", "신청", "금리", "후기"];
  let n = 0;
  while (result.length < count && n < 200) {
    n++;
    const s = extra[n % extra.length];
    const k = `${base} ${s} ${n}`;
    if (!used.has(k) && isMeaningfulKeyword(k)) {
      used.add(k);
      result.push({
        keyword: k,
        relevance: 0.3 + Math.random() * 0.5,
        searchVolume: Math.floor(50 + Math.random() * 500),
      });
    }
  }

  return Promise.resolve(result.slice(0, count));
}

function sortKeywords(keywords, sortBy) {
  const list = [...keywords];
  if (sortBy === "relevance") list.sort((a, b) => b.relevance - a.relevance);
  else if (sortBy === "searchVolume") list.sort((a, b) => b.searchVolume - a.searchVolume);
  else if (sortBy === "mixed") {
    list.sort((a, b) => {
      const sa = a.relevance * 100 + Math.log10(a.searchVolume + 1) * 20;
      const sb = b.relevance * 100 + Math.log10(b.searchVolume + 1) * 20;
      return sb - sa;
    });
  }
  return list;
}

window.KeywordService = {
  getRelatedKeywords,
  getRelatedKeywordsParallel,
  sortKeywords,
  isMeaningfulKeyword,
  MEANINGLESS_SUFFIXES,
  AD_RELEVANT_SUFFIXES,
};
