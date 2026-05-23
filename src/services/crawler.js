/**
 * 🕷️ [crawler.js] 롤 공식 홈페이지 실시간 크롤링 전담 서비스 모듈
 */

const LOL_GAME_UPDATES_URL = 'https://www.leagueoflegends.com/ko-kr/news/game-updates/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 롤 공식 홈페이지 게임 업데이트 뉴스 리스트를 긁어와 지정된 순서의 패치노트 기사 주소를 추출합니다.
 * @param {boolean} isPrev 바로 지난(이전) 패치노트를 조회할 것인지 여부
 * @returns {Promise<{ fullUrl: string, patchDisplayName: string, patchRound: string, rawPath: string }>} 파싱된 패치노트 메타데이터
 */
export async function fetchPatchNoteData(isPrev = false) {
  try {
    const response = await fetch(LOL_GAME_UPDATES_URL, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (!response.ok) {
      throw new Error(`롤 공식 홈페이지 상태 불량 (HTTP ${response.status})`);
    }

    const html = await response.text();

    const patchUrlRegex = /\/ko-kr\/news\/game-updates\/[a-zA-Z0-9-]*patch-[0-9a-zA-Z-]+-notes\/?/g;
    const matches = html.match(patchUrlRegex);

    if (!matches || matches.length === 0) {
      throw new Error('공식 페이지 HTML 소스코드에서 패치노트 링크 패턴을 매칭하는 데 실패했습니다.');
    }

    const uniqueMatches = [...new Set(matches)];

    let targetPath = '';
    if (!isPrev) {
      targetPath = uniqueMatches[0];
    } else {
      if (uniqueMatches.length < 2) {
        throw new Error('이전 패치노트 링크가 페이지 목록에 아직 존재하지 않습니다.');
      }
      targetPath = uniqueMatches[1];
    }

    const fullUrl = `https://www.leagueoflegends.com${targetPath}`;

    const versionMatch = targetPath.match(/patch-(\d+)-(\d+)-notes/);
    let patchDisplayName = '최신 패치';
    let patchRound = 'unknown';

    if (versionMatch && versionMatch.length >= 3) {
      patchDisplayName = `${versionMatch[1]}.${versionMatch[2]} 패치`;
      patchRound = versionMatch[2];
    }

    return {
      fullUrl,
      patchDisplayName,
      patchRound,
      rawPath: targetPath
    };

  } catch (error) {
    console.error('[Crawler Service Error] ', error);
    throw error;
  }
}

/**
 * 특정 패치노트 상세 페이지 URL에 직접 접속하여 텍스트 문단 및 지연 로드(Lazy Load) 이미지까지 한 개도 빠짐없이 긁어옵니다.
 * @param {string} detailUrl 상세 패치노트 URL 주소
 * @returns {Promise<string>} 정제된 패치노트 기사 본문 텍스트 (고화질 이미지 마크다운 포함)
 */
export async function fetchPatchNoteDetailText(detailUrl) {
  try {
    console.log(`[크롤러] 패치노트 본문(텍스트+지연 로드 고화질 이미지) 정밀 스크랩 개시: ${detailUrl}`);
    const response = await fetch(detailUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (!response.ok) {
      throw new Error(`패치노트 상세 페이지 스크랩 실패 (HTTP ${response.status})`);
    }

    const html = await response.text();
    let articleElements = [];

    // 💡 [초정밀 __NEXT_DATA__ 파싱 시도]
    // 라이엇 게임즈는 Next.js SSR 환경이므로 본문의 진짜 소스와 풍부한 이미지는 HTML 최하단
    // <script id="__NEXT_DATA__" type="application/json"> 태그 내부에 완벽히 구조화되어 숨겨져 있습니다.
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    let successNextData = false;

    if (nextDataMatch) {
      try {
        console.log(`[크롤러] __NEXT_DATA__ 스크립트 블록 발견. 정밀 파싱 개시...`);
        const jsonData = JSON.parse(nextDataMatch[1]);
        const blades = jsonData?.props?.pageProps?.page?.blades || [];
        const patchNotesBlade = blades.find(b => b.type === 'patchNotesRichText');

        if (patchNotesBlade && patchNotesBlade.richText && patchNotesBlade.richText.body) {
          const bodyHtml = patchNotesBlade.richText.body;
          console.log(`[크롤러] 생 HTML 본문 획득 성공 (크기: ${bodyHtml.length}자). 핵심 섹션 오려내기 분석을 시작합니다.`);

          // 🎯 [핵심 패치 정보 타겟팅 필터링]
          // 패치 하이라이트, 챔피언, 아이템, 룬 섹션의 HTML 조각만 정밀 오려내기 합니다.
          const targetIds = ['patch-patch-highlights', 'patch-champions', 'patch-items', 'patch-runes'];
          let targetedHtml = '';

          targetIds.forEach(id => {
            const regex = new RegExp(`<header[^>]*>\\s*<h2[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/header>`, 'i');
            const match = bodyHtml.match(regex);
            
            if (match) {
              const startIndex = match.index;
              // 다음 <header class="header-primary">가 나타나는 구간까지 슬라이싱
              const nextHeaderRegex = /<header[^>]*class=["']header-primary["']/gi;
              nextHeaderRegex.lastIndex = startIndex + match[0].length;
              
              const nextHeaderMatch = nextHeaderRegex.exec(bodyHtml);
              let endIndex = bodyHtml.length;
              if (nextHeaderMatch) {
                endIndex = nextHeaderMatch.index;
              }
              
              targetedHtml += bodyHtml.substring(startIndex, endIndex) + '\n\n';
            }
          });

          // 🛡️ [철벽 Fallback] 만약 매칭 정보가 없으면 본문 전체를 긁어오도록 조치
          if (!targetedHtml) {
            console.log(`[크롤러 Info] 타겟 섹션을 발견하지 못했습니다. 본문 전체를 파싱합니다.`);
            targetedHtml = bodyHtml;
          } else {
            console.log(`[크롤러 Success] 핵심 3대장(챔피언/아이템/룬) 섹션만 선택적 슬라이싱 성공! (크기: ${targetedHtml.length}자)`);
          }

          // h1~h6, p, li, blockquote, img 태그를 문서의 원본 배치 순서대로 순회하며 긁어냅니다.
          const combinedRegex = /<(p|li|h1|h2|h3|h4|h5|h6|blockquote)[^>]*>([\s\S]*?)<\/ \1>|<(p|li|h1|h2|h3|h4|h5|h6|blockquote)[^>]*>([\s\S]*?)<\/\3>|<img([^>]+)>/gi;
          let matches;

          while ((matches = combinedRegex.exec(targetedHtml)) !== null) {
            const tagName = matches[1] || matches[3];
            const tagContent = matches[2] || matches[4];
            const imgAttributes = matches[5];

            if (imgAttributes) {
              // 이미지 태그에서 src, srcset, data-src 중 진짜 원본 URL 추적
              const urlMatch = imgAttributes.match(/(?:src|srcset|data-src)=["']([^"']+)["']/i);
              if (urlMatch) {
                const rawUrl = urlMatch[1].split(',')[0].trim();
                const cleanImgUrl = rawUrl.split(' ')[0];

                // 플레이스홀더 성격의 가짜 SVG 이미지는 과감히 필터링하고 Riot 공식 CDN 리소스만 채택
                if (cleanImgUrl && !cleanImgUrl.startsWith('data:image') && 
                    (cleanImgUrl.includes('rgpub.io') || cleanImgUrl.includes('contentstack.io') || 
                     cleanImgUrl.includes('akamaihd.net') || cleanImgUrl.includes('leagueoflegends.com'))) {
                  articleElements.push(`![lol-image](${cleanImgUrl})`);
                }
              }
            } else if (tagContent) {
              // 텍스트 태그 감지 시, 내부에 이미지가 자식 노드로 들어있는 경우 보존 치환
              let processedContent = tagContent;
              
              // 내부에 든 img 태그들을 마크다운 기호로 치환
              processedContent = processedContent.replace(/<img([^>]+)>/gi, (match, imgAttrs) => {
                const urlMatch = imgAttrs.match(/(?:src|srcset|data-src)=["']([^"']+)["']/i);
                if (urlMatch) {
                  const cleanImgUrl = urlMatch[1].split(',')[0].trim().split(' ')[0];
                  if (cleanImgUrl && !cleanImgUrl.startsWith('data:image') && 
                      (cleanImgUrl.includes('rgpub.io') || cleanImgUrl.includes('contentstack.io') || 
                       cleanImgUrl.includes('akamaihd.net') || cleanImgUrl.includes('leagueoflegends.com'))) {
                    return `\n\n![lol-image](${cleanImgUrl})\n\n`;
                  }
                }
                return '';
              });

              // 이제 남은 순수 HTML 태그들만 걷어내고 순수 텍스트 정제
              const cleanText = processedContent
                .replace(/<[^>]*>/g, '') // 내부 HTML 태그 제거
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim();

              if (cleanText) {
                if (tagName.toLowerCase().startsWith('h')) {
                  articleElements.push(`## ${cleanText}`);
                } else {
                  // 치환 과정에서 줄바꿈이 생겼을 수 있으므로 줄 단위 정돈하여 푸시
                  const lines = cleanText.split('\n');
                  lines.forEach(l => {
                    const trimmed = l.trim();
                    if (trimmed) {
                      articleElements.push(trimmed);
                    }
                  });
                }
              }
            }
          }
          console.log(`[크롤러] __NEXT_DATA__ 파싱을 통해 총 ${articleElements.length}개의 본문 조각(이미지 포함) 확보 완료!`);
          successNextData = true;
        }
      } catch (jsonErr) {
        console.warn(`[크롤러 Warning] __NEXT_DATA__ JSON 파싱 중 일시적 오류 발생. Fallback 단순 HTML 파서로 자동 전환합니다.`, jsonErr);
      }
    }

    // 💡 [Fallback] 만약 __NEXT_DATA__가 없거나 파싱에 실패했다면, 기존 HTML 단순 정규식 패턴 매칭 수행
    if (!successNextData) {
      console.log(`[크롤러 Fallback] 기존 HTML 기반 단순 정규식 파서 작동`);
      const combinedRegex = /<(p|li|h1|h2|h3|h4|h5|h6)[^>]*>(.*?)<\/\1>|<img([^>]+)>/gi;
      let matches;

      while ((matches = combinedRegex.exec(html)) !== null) {
        if (matches[3]) {
          const imgAttributes = matches[3];
          const urlMatch = imgAttributes.match(/(?:src|srcset|data-src)=["'](https:\/\/cmsassets\.rgpub\.io\/sanity\/images\/[^"'\s?]+|https:\/\/images\.contentstack\.io\/v3\/assets\/[^"'\s?]+|https:\/\/am-a\.akamaihd\.net\/image\?[^"'\s]+)/i);
          
          if (urlMatch) {
            const rawUrl = urlMatch[1].split(',')[0].trim();
            const cleanImgUrl = rawUrl.split(' ')[0];
            articleElements.push(`![lol-image](${cleanImgUrl})`);
          }
        } else {
          const tagContent = matches[2];
          const cleanText = tagContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          
          if (cleanText && cleanText.length > 5) {
            articleElements.push(cleanText);
          }
        }
      }
    }

    if (articleElements.length === 0) {
      return '⚠️ 본문 데이터를 정밀 분석하여 추출해 내지 못했습니다. (라이엇 페이지 구조 변경 가능성)';
    }

    return articleElements.join('\n\n');

  } catch (error) {
    console.error('[Crawler Detail Scraping Error] ', error);
    throw error;
  }
}
