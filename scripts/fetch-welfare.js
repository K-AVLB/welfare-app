import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.PUBLIC_DATA_BASE_URL;
const SERVICE_KEY = process.env.PUBLIC_DATA_API_KEY;
const PAGE_SIZE = Number(process.env.PUBLIC_DATA_PAGE_SIZE || 100);
const MAX_RETRIES = Number(process.env.PUBLIC_DATA_MAX_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.PUBLIC_DATA_RETRY_DELAY_MS || 1500);

function firstValue(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function extractItems(parsed) {
  const list = parsed?.wantedList?.servList;
  if (Array.isArray(list)) return list;
  if (list) return [list];
  return [];
}

function extractTotalCount(parsed) {
  const totalCount =
    firstValue(parsed?.wantedList?.totalCount) ??
    firstValue(parsed?.wantedList?.numFound) ??
    firstValue(parsed?.wantedList?.pageInfo?.[0]?.totalCount);

  const numeric = Number(totalCount);
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchWelfarePage(pageNo) {
  const url =
    `${BASE_URL}?serviceKey=${encodeURIComponent(SERVICE_KEY)}` +
    `&callTp=L` +
    `&pageNo=${pageNo}` +
    `&numOfRows=${PAGE_SIZE}` +
    `&srchKeyCode=003`;

  console.log("요청 URL:", url);

  let response;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      break;
    } catch (error) {
      lastError = error;

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `페이지 ${pageNo} 요청 실패 (${attempt}/${MAX_RETRIES}): ${error.message}. ${delay}ms 후 재시도합니다.`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!response) {
    throw lastError ?? new Error("API 응답을 받지 못했습니다.");
  }

  const xmlText = await response.text();
  console.log("원본 XML 일부:", xmlText.slice(0, 500));

  const parsed = await parseStringPromise(xmlText);
  console.log("파싱 결과 최상단 키:", Object.keys(parsed));

  const items = extractItems(parsed);
  const totalCount = extractTotalCount(parsed);

  console.log(`페이지 ${pageNo} item 개수:`, items.length);
  if (totalCount !== null) {
    console.log("전체 item 개수:", totalCount);
  }

  if (items.length > 0) {
    console.log("첫 번째 item 샘플:", JSON.stringify(items[0], null, 2));
  }

  return { items, totalCount };
}

async function fetchWelfareData() {
  const allItems = [];
  let pageNo = 1;
  let totalCount = null;

  while (true) {
    const { items, totalCount: fetchedTotalCount } = await fetchWelfarePage(pageNo);

    if (totalCount === null && fetchedTotalCount !== null) {
      totalCount = fetchedTotalCount;
    }

    allItems.push(...items);

    if (items.length < PAGE_SIZE) break;
    if (totalCount !== null && allItems.length >= totalCount) break;

    pageNo += 1;
  }

  console.log("최종 수집 item 개수:", allItems.length);
  return allItems;
}

async function saveRawToSupabase(items) {
  for (const item of items) {
    const sourceKey =
      item?.inqNum?.[0] ||
      item?.servId?.[0] ||
      item?.id?.[0] ||
      null;

    const payload = {
      source: "national_welfare_api",
      source_key: sourceKey,
      payload: item,
    };

    const { data: existing, error: selectError } = await supabase
      .from("api_programs_raw")
      .select("id")
      .eq("source", "national_welfare_api")
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (selectError) {
      console.error("기존 데이터 조회 실패:", sourceKey, selectError.message);
      continue;
    }

    const operation = existing
      ? supabase.from("api_programs_raw").update(payload).eq("id", existing.id)
      : supabase.from("api_programs_raw").insert(payload);

    const { error } = await operation;

    if (error) {
      console.error("저장 실패:", error.message);
    } else {
      console.log("저장 성공:", sourceKey);
    }
  }
}

async function main() {
  try {
    const items = await fetchWelfareData();

    if (items.length === 0) {
      console.log("가져온 데이터가 없습니다.");
      return;
    }

    await saveRawToSupabase(items);

    console.log("완료");
  } catch (error) {
    console.error("실행 오류:", error);
  }
}

main();
