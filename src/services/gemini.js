/**
 * 🧠 [gemini.js] Google Gemini AI 통신 전담 서비스 모듈
 * (인터페이스를 고정시켜 두어 나중에 OpenAI, Claude 등 타 LLM으로 초고속 교체 가능)
 */

import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

/**
 * 긁어온 원본 텍스트 데이터를 주어진 프롬프트 가이드에 맞춰 요약정리합니다.
 * @param {string} rawContent 크롤링해온 날 것의 패치노트 본문 또는 정보
 * @param {string} promptTemplate AI에게 주입할 명령 프롬프트 지침서
 * @returns {Promise<string>} AI가 정리한 이쁜 요약 내용 (마크다운 혹은 HTML용 텍스트)
 */
export async function generateAiSummary(rawContent, promptTemplate) {
  // 💡 [보안 장치] 아직 Gemini API Key를 등록하지 않았을 경우 개발용 테스트를 위해
  // 봇이 에러로 고장나는 것을 막고, 모형 요약(Mock Summary) 데이터를 유연하게 제공합니다!
  if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE' || API_KEY === '') {
    console.warn('[Gemini Service] 경고: GEMINI_API_KEY가 없습니다. 모형 데이터(Mock Data)를 활용합니다.');
    
    // 개발 편의를 위한 딜레이 재현 (1.5초)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return (
      `## 🏆 26.10 패치 하이라이트 요약 (AI Mock)\n` +
      `*   **챔피언 밸런스 조정:** 야스오의 기본 공격력이 상향되고, 유미의 힐량이 소폭 조정되었습니다.\n` +
      `*   **신규 아이템 출시:** 정글 전용 전설 아이템인 '정령의 발톱'이 테스트 후 정식 적용됩니다.\n` +
      `*   **시스템 패치:** 랭크 게임 대기열에서의 트롤 방지 시스템이 한 단계 고도화됩니다.\n\n` +
      `*(※ 이 요약은 GEMINI_API_KEY가 설정되지 않아 로컬 에뮬레이팅된 임시 데이터입니다. 실제 연동 시 AI 요약으로 완벽하게 대체됩니다!)*`
    );
  }

  try {
    // 💡 [동적 임포트 테크닉] API 키가 진짜 존재하여 실제 호출이 필요한 이 시점에만
    // 라이브러리를 동적으로 로딩합니다! 패키지 미설치로 인한 부팅 에러를 원천 차단합니다.
    const { GoogleGenAI } = await import('@google/genai');

    // 1) 구글 Gemini AI SDK 인스턴스 생성
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 2) 요약할 내용과 명령서(프롬프트) 조립
    const fullPrompt = `${promptTemplate}\n\n[요약 대상 원본 데이터]\n${rawContent}`;

    // 3) AI 서버 호출
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // 가볍고 매우 빠른 최신 Flash 모델 권장
      contents: fullPrompt,
    });

    if (!response.text) {
      throw new Error('Gemini 서버 응답에서 텍스트 결과물을 받지 못했습니다.');
    }

    return response.text;

  } catch (error) {
    console.error('[Gemini Service Error] ', error);
    throw error;
  }
}
