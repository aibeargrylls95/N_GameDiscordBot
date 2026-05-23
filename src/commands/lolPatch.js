/**
 * ⚙️ [lolPatch.js] 롤 패치노트 실시간 스크랩 및 AI HTML 요약 시나리오 총 지휘 컨트롤러
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchPatchNoteData, fetchPatchNoteDetailText } from '../services/crawler.js';
import { generateStaticHtmlFile } from '../utils/htmlGenerator.js';

// ES Module 환경에서의 __dirname 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 정적 캐시 파일이 저장되는 구역 경로
const CACHE_DIR = path.join(__dirname, '../../public/rendered');

/**
 * 롤 패치 조회 시나리오 전체를 총괄 기획하여 디스코드 메시지로 응답 카드를 완성합니다.
 * @param {any} message 디스코드 메시지 객체
 * @param {boolean} isPrev 바로 지난(이전) 패치노트를 조회할 것인지 여부
 */
export async function handleLolPatchCommand(message, isPrev = false) {
  // 1) 입력 중 상태 표시
  await message.channel.sendTyping();

  try {
    // 2) 크롤러 서비스를 호출하여 최신 기사 URL 및 버전 정보 획득
    const patchData = await fetchPatchNoteData(isPrev);
    const { fullUrl, patchDisplayName } = patchData;

    // 패치 버전을 활용해 로컬 캐시 파일명이 될 이름 정의 (예: "26.10" -> "lol-patch-26-10.html")
    const formattedVersion = patchDisplayName.replace(' 패치', '').replace('.', '-');
    const cacheFileName = `lol-patch-${formattedVersion}.html`;
    const cacheFilePath = path.join(CACHE_DIR, cacheFileName);

    let htmlLink = '';
    let isCached = false;

    // ⭐ [핵심 캐싱 알고리즘] 이미 이 버전에 맞게 구워진 HTML 캐시 파일이 로컬 드라이브에 존재하는가?
    if (fs.existsSync(cacheFilePath)) {
      console.log(`[Cache Hit] 이미 구워진 캐시 파일을 발견했습니다: ${cacheFileName}`);
      
      const normalizedPath = cacheFilePath.replace(/\\/g, '/');
      htmlLink = `file:///${normalizedPath}`;
      isCached = true;
    } else {
      // 🆕 [Cache Miss] 최초 1회 요청! 진짜 실시간 크롤러를 깨웁니다!
      console.log(`[Cache Miss] 첫 번째 요청입니다. 실시간 본문 크롤링을 실행합니다.`);
      
      // 3) 💡 [Riot 공홈 정밀 타격] 상세 패치노트 본문 주소에 들어가 진짜 한글 텍스트들을 전부 긁어옵니다.
      const realContent = await fetchPatchNoteDetailText(fullUrl);

      // 4) 💡 [사용자 요구사항 반영] AI 요약을 거치지 않고, 긁어온 실시간 진짜 패치노트 원본 텍스트를
      // 생성될 HTML 파일에 그대로 100% 날것으로 적재하여 저장합니다!
      htmlLink = await generateStaticHtmlFile(patchDisplayName.replace(' 패치', ''), realContent);
    }

    // 5) 최종 디스코드 답장 메시지 카드 조립 및 반환
    const lolPatchReply = 
      `🏆 **League of Legends 실시간 패치 정보**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• **분석 대상:** **${isPrev ? '바로 지난번(이전)' : '최신 릴리즈'}**\n` +
      `• **패치 버전:** **${patchDisplayName}**\n` +
      `• **데이터 상태:** ${isCached ? '🟢 로컬 파일 캐시 히트 (초고속 반환)' : '🆕 실시간 본문 원본 스크랩 완료'}\n\n` +
      `🔗 **공식 롤 홈페이지 바로가기:**\n` +
      ` ${fullUrl}\n\n` +
      `🎨 **실시간 긁어온 본문 데이터 원본 HTML 리포트:**\n` +
      `🔗 ${htmlLink}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*※ AI 가공 전에, 롤 공홈 기사 본문 텍스트가 정상적으로 수집되었는지 눈으로 직접 확인할 수 있는 원본 파일입니다.*`;

    await message.reply(lolPatchReply);

  } catch (error) {
    console.error('[LolPatch Command Controller Error] ', error);
    await message.reply('❌ 롤 패치노트 비즈니스 처리 도중 문제가 발생했습니다. 에러 로그를 확인해 주세요.');
  }
}
