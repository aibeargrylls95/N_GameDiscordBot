/**
 * 🎨 [htmlGenerator.js] AI 요약본을 받아 완성도 높은 정적 HTML 페이지로 구워 저장하는 유틸 모듈
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ES Module 환경에서의 __dirname 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 정적 파일들이 저장될 루트 디렉토리
const RENDERED_DIR = path.join(__dirname, '../../public/rendered');

/**
 * AI 요약본(혹은 기사 원본)을 세련된 CSS 스타일링 및 기사 이미지 액자가 적용된 HTML 문서 파일로 물리적 저장합니다.
 * @param {string} patchVersion 패치 명칭 (예: "26.10")
 * @param {string} summaryText AI가 제공해 준 마크다운/텍스트 요약본 (이미지 마크다운 포함)
 * @returns {Promise<string>} 로컬 탐색기 브라우저로 바로 열 수 있는 file:/// 형태의 크로스 플랫폼 URL 링크
 */
export async function generateStaticHtmlFile(patchVersion, summaryText) {
  try {
    // 1) /public/rendered 폴더가 없으면 에러 방지를 위해 자동 생성
    if (!fs.existsSync(RENDERED_DIR)) {
      fs.mkdirSync(RENDERED_DIR, { recursive: true });
    }

    // 파일 저장명 규격화 (예: 26.10 -> 26-10)
    const formattedVersion = patchVersion.replace('.', '-');
    const fileName = `lol-patch-${formattedVersion}.html`;
    const filePath = path.join(RENDERED_DIR, fileName);

    // 2) 세련된 UI (글래스모피즘, 프리미엄 다크모드, 미려한 폰트) CSS 및 호버 인터랙션 이미지 내장 HTML
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎮 LoL ${patchVersion} 패치노트 실시간 AI 브리핑</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0b0f19;
      --card-bg: rgba(22, 31, 50, 0.7);
      --border-color: rgba(200, 170, 110, 0.2);
      --primary-color: #c8aa6e; /* 롤 골드 컬러 */
      --text-color: #f0f0f5;
      --text-muted: #a0a5b5;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: radial-gradient(circle at center, #161f32 0%, var(--bg-color) 70%);
      color: var(--text-color);
      font-family: 'Outfit', 'Noto Sans KR', sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
    }

    /* 💡 [요구사항 1] 가운데 container 영역 유지 및 세련되게 장식 */
    .container {
      width: 100%;
      max-width: 800px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.8s ease-out;
    }

    header {
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }

    header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
      text-shadow: 0 0 10px rgba(200, 170, 110, 0.3);
    }

    header p {
      color: var(--text-muted);
      font-size: 16px;
    }

    .content-box {
      font-size: 17px;
      line-height: 1.8;
      color: var(--text-color);
    }

    /* 💡 [요구사항 2] 패치 하이라이트 전용 레이아웃 및 크기 완벽 유지 */
    .patch-img-box {
      text-align: center;
      margin: 25px 0;
      animation: fadeIn 1.2s ease-out;
    }

    .patch-img {
      border-radius: 12px;
      max-width: 100%;
      height: auto;
      border: 1px solid var(--border-color);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
      transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s;
    }

    .patch-img:hover {
      transform: scale(1.02);
      box-shadow: 0 15px 30px rgba(200, 170, 110, 0.25);
    }

    /* 공통 목차 헤더 스타일 */
    .content-box h2 {
      color: var(--primary-color);
      font-size: 22px;
      margin-top: 40px;
      margin-bottom: 20px;
      border-left: 4px solid var(--primary-color);
      padding-left: 12px;
      letter-spacing: 1px;
    }

    /* 💡 [요구사항 3] 가로로 긴 챔피언별 카드 컨테이너 스타일 */
    .champions-container {
      margin-top: 20px;
    }

    .champion-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(200, 170, 110, 0.15);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 25px;
      transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1), border-color 0.3s, box-shadow 0.3s;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .champion-card:hover {
      transform: translateY(-2px);
      border-color: rgba(200, 170, 110, 0.4);
      box-shadow: 0 8px 25px rgba(200, 170, 110, 0.12);
    }

    /* 💡 [요구사항 3] 상단 헤더: 초상화 + 챔피언 이름 */
    .champ-header {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(200, 170, 110, 0.1);
      padding-bottom: 14px;
      margin-bottom: 18px;
    }

    .champ-portrait {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid var(--primary-color);
      box-shadow: 0 0 10px rgba(200, 170, 110, 0.3);
    }

    .champ-name {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    /* 💡 [요구사항 3] 가로 정렬 로우: 스킬 이미지 + 변경점 텍스트 */
    .champ-changes {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skill-row {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 15px;
    }

    .skill-row:last-child {
      margin-bottom: 0;
    }

    .skill-left {
      flex-shrink: 0;
    }

    .skill-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
      transition: transform 0.2s;
    }

    .skill-icon:hover {
      transform: scale(1.1);
    }

    .skill-icon-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(200, 170, 110, 0.1);
      border: 1px solid var(--border-color);
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--primary-color);
      font-weight: bold;
    }

    .skill-right {
      flex-grow: 1;
    }

    .skill-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--primary-color);
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    .skill-right ul {
      list-style-type: none;
      margin-left: 0;
      margin-bottom: 0;
    }

    .skill-right li {
      position: relative;
      padding-left: 18px;
      font-size: 14px;
      line-height: 1.6;
      color: #d1d5db;
      margin-bottom: 5px;
    }

    .skill-right li:last-child {
      margin-bottom: 0;
    }

    .skill-right li::before {
      content: "✦";
      position: absolute;
      left: 0;
      color: var(--primary-color);
      font-size: 12px;
    }

    /* 화살표 가독성 부스터 */
    .arrow-indicator {
      color: #ff9d00;
      font-weight: bold;
      margin: 0 5px;
      text-shadow: 0 0 5px rgba(255, 157, 0, 0.4);
    }

    /* 아이템 및 룬 섹션 미려한 가로형 한 줄 컨테이너 */
    .items-list, .runes-list {
      list-style-type: none;
      margin-bottom: 40px;
    }

    .item-icon-box, .rune-icon-box {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 25px;
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }

    .item-inline-icon, .rune-inline-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid rgba(200, 170, 110, 0.3);
    }

    .item-name, .rune-name {
      font-size: 17px;
      font-weight: 600;
      color: #ffffff;
    }

    .item-change-detail, .rune-change-detail {
      position: relative;
      padding-left: 20px;
      font-size: 14px;
      color: #d1d5db;
      margin-bottom: 8px;
      line-height: 1.6;
    }

    .item-change-detail::before, .rune-change-detail::before {
      content: "✦";
      position: absolute;
      left: 0;
      color: var(--primary-color);
    }

    footer {
      margin-top: 40px;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
    }

    footer a {
      color: var(--primary-color);
      text-decoration: none;
      transition: color 0.3s;
    }

    footer a:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <div class="container">
    <header>
      <h1>🎮 LEAGUE OF LEGENDS</h1>
      <p>${patchVersion} 패치노트 실시간 AI 브리핑 리포트</p>
    </header>

    <div class="content-box">
      ${(() => {
        // 빈 줄과 앞뒤 공백을 사전에 완벽히 걸러낸 진짜 글자 라인들로만 정돈합니다.
        const lines = summaryText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let currentSection = ''; // 'highlights', 'champions', 'items', 'runes'
        let resultHtml = '';

        // 챔피언 수집용 임시 데이터셋
        let championsData = [];
        let currentChamp = null;
        let currentSkill = null;

        // 아이템 & 룬 수집용 임시 HTML 빌더
        let itemsHtml = '<h2>🛡️ 아이템 변경 사항</h2>\n<ul class="items-list">\n';
        let runesHtml = '<h2>🔮 룬 변경 사항</h2>\n<ul class="runes-list">\n';

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];

          // --- 1. 섹션 경계 전환 감지 ---
          if (line.startsWith('## 패치 하이라이트')) {
            currentSection = 'highlights';
            resultHtml += `<h2>🎮 패치 하이라이트</h2>\n`;
            continue;
          }
          if (line.startsWith('## 챔피언')) {
            currentSection = 'champions';
            continue;
          }
          if (line.startsWith('## 아이템')) {
            currentSection = 'items';
            continue;
          }
          if (line.startsWith('## 룬')) {
            currentSection = 'runes';
            continue;
          }

          // --- 2. 섹션별 최적화 파싱 적용 ---
          if (currentSection === 'highlights') {
            // 💡 [요구사항 2] 패치하이라이트는 현재의 비주얼과 크기를 완벽하게 유지
            if (line.startsWith('![lol-image]')) {
              const imgUrlMatch = line.match(/!\[lol-image\]\((.*?)\)/);
              if (imgUrlMatch) {
                resultHtml += `<div class="patch-img-box"><img src="${imgUrlMatch[1]}" class="patch-img" alt="lol-patch-artwork"></div>\n`;
              }
            } else {
              let paragraphText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              resultHtml += `<p style="margin-bottom: 12px; text-align: center;">${paragraphText}</p>\n`;
            }
          } 
          
          else if (currentSection === 'champions') {
            // 💡 [요구사항 3] 챔피언 전용 가로형 가로 컨테이너 파싱
            
            // A) 챔피언 초상화 이미지 감지 및 챔피언 노드 생성
            if (line.startsWith('![lol-image]') && lines[i+1] && lines[i+1].trim().startsWith('##')) {
              const imgUrlMatch = line.match(/!\[lol-image\]\((.*?)\)/);
              const nameLine = lines[i+1].trim();
              const champName = nameLine.replace(/^##\s*/, '');

              if (imgUrlMatch) {
                // 이전 챔피언 노드가 완성되었다면 배열에 누적
                if (currentChamp) {
                  if (currentSkill) {
                    currentChamp.skills.push(currentSkill);
                    currentSkill = null;
                  }
                  championsData.push(currentChamp);
                }

                currentChamp = {
                  name: champName,
                  portrait: imgUrlMatch[1],
                  skills: []
                };

                i++; // 챔피언 이름 라인(## 챔피언이름)은 이미 긁었으므로 인덱스 점프

                // 💡 [요구사항 3] 챔피언 이름 바로 아래의 기획 의도 및 설명 문구 걸러내기 (Skip)
                let nextLine = lines[i+1] ? lines[i+1].trim() : '';
                if (nextLine && !nextLine.startsWith('##') && !nextLine.startsWith('![lol-image]') && !nextLine.startsWith('*') && !nextLine.startsWith('-')) {
                  console.log(`[HTML 빌더] 걸러진 챔피언 의도 문구 스킵: ${champName}`);
                  i++; // 의도 설명 라인 인덱스 점프하여 완전히 걸러냄!
                }
              }
              continue;
            }

            // B) 챔피언 내부의 스킬 정보 헤더 감지
            if (line.startsWith('##')) {
              if (currentChamp) {
                if (currentSkill) {
                  currentChamp.skills.push(currentSkill);
                }

                let skillName = line.replace(/^##\s*/, '');
                let skillIcon = '';

                // 스킬 아이콘 이미지 추출
                const imgMatch = skillName.match(/!\[lol-image\]\((.*?)\)/);
                if (imgMatch) {
                  skillIcon = imgMatch[1];
                  skillName = skillName.replace(/!\[lol-image\]\((.*?)\)/, '').trim();
                }

                currentSkill = {
                  name: skillName,
                  icon: skillIcon,
                  changes: []
                };
              }
              continue;
            }

            // C) 해당 스킬의 세부 변경점 텍스트 누적
            if (currentSkill && !line.startsWith('##') && !line.startsWith('![lol-image]')) {
              let changeText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              changeText = changeText.replace(/⇒/g, '<span class="arrow-indicator">⇒</span>');
              currentSkill.changes.push(changeText);
            }
          } 
          
          else if (currentSection === 'items') {
            // 아이템 세련된 구조적 조립
            if (line.startsWith('![lol-image]')) {
              const imgUrlMatch = line.match(/!\[lol-image\]\((.*?)\)/);
              if (imgUrlMatch) {
                itemsHtml += `  <div class="item-icon-box"><img src="${imgUrlMatch[1]}" class="item-inline-icon">`;
              }
            } else if (line.startsWith('##')) {
              const itemName = line.replace(/^##\s*/, '');
              itemsHtml += `<span class="item-name">${itemName}</span></div>\n`;
            } else {
              let changeText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/⇒/g, '<span class="arrow-indicator">⇒</span>');
              itemsHtml += `  <li class="item-change-detail">${changeText}</li>\n`;
            }
          } 
          
          else if (currentSection === 'runes') {
            // 룬 세련된 구조적 조립
            if (line.startsWith('![lol-image]')) {
              const imgUrlMatch = line.match(/!\[lol-image\]\((.*?)\)/);
              if (imgUrlMatch) {
                runesHtml += `  <div class="rune-icon-box"><img src="${imgUrlMatch[1]}" class="rune-inline-icon">`;
              }
            } else if (line.startsWith('##')) {
              const runeName = line.replace(/^##\s*/, '');
              runesHtml += `<span class="rune-name">${runeName}</span></div>\n`;
            } else {
              let changeText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/⇒/g, '<span class="arrow-indicator">⇒</span>');
              runesHtml += `  <li class="rune-change-detail">${changeText}</li>\n`;
            }
          }
        }

        // 마지막 챔피언 수집품 닫기
        if (currentChamp) {
          if (currentSkill) {
            currentChamp.skills.push(currentSkill);
          }
          championsData.push(currentChamp);
        }

        // --- 3. 💡 [요구사항 3] 수집된 데이터로 고품격 챔피언 가로형 카드 HTML 조립 ---
        let champCardsHtml = '<h2>⚔️ 챔피언 밸런스 조정</h2>\n<div class="champions-container">\n';

        championsData.forEach(champ => {
          champCardsHtml += `  <!-- 💡 [요구사항 3] 가로로 긴 챔피언별 카드 컨테이너 -->\n`;
          champCardsHtml += `  <div class="champion-card">\n`;
          champCardsHtml += `    <!-- 💡 [요구사항 3] 상단 헤더: 초상화 + 챔피언 이름 -->\n`;
          champCardsHtml += `    <div class="champ-header">\n`;
          champCardsHtml += `      <img src="${champ.portrait}" class="champ-portrait" alt="${champ.name}">\n`;
          champCardsHtml += `      <span class="champ-name">${champ.name}</span>\n`;
          champCardsHtml += `    </div>\n`;
          champCardsHtml += `    <div class="champ-changes">\n`;

          champ.skills.forEach(skill => {
            champCardsHtml += `      <!-- 💡 [요구사항 3] 가로 정렬 로우: 스킬 이미지 + 변경점 텍스트 -->\n`;
            champCardsHtml += `      <div class="skill-row">\n`;
            champCardsHtml += `        <div class="skill-left">\n`;
            if (skill.icon) {
              champCardsHtml += `          <img src="${skill.icon}" class="skill-icon" alt="${skill.name}">\n`;
            } else {
              champCardsHtml += `          <div class="skill-icon-placeholder">✦</div>\n`;
            }
            champCardsHtml += `        </div>\n`;
            champCardsHtml += `        <div class="skill-right">\n`;
            champCardsHtml += `          <div class="skill-name">${skill.name}</div>\n`;
            champCardsHtml += `          <ul>\n`;
            skill.changes.forEach(change => {
              champCardsHtml += `            <li>${change}</li>\n`;
            });
            champCardsHtml += `          </ul>\n`;
            champCardsHtml += `        </div>\n`;
            champCardsHtml += `      </div>\n`;
          });

          champCardsHtml += `    </div>\n`;
          champCardsHtml += `  </div>\n\n`;
        });

        champCardsHtml += '</div>\n';

        itemsHtml += '</ul>\n';
        runesHtml += '</ul>\n';

        // 최종 HTML 파트 결합
        resultHtml += champCardsHtml + '\n' + itemsHtml + '\n' + runesHtml;
        return resultHtml;
      })()}
    </div>

    <footer>
      <p>N_GameDiscordBot AI 시스템에 의해 실시간 가공되었습니다.</p>
      <p>© 2026 Riot Games. All rights reserved. <a href="https://www.leagueoflegends.com" target="_blank">Riot Games 공식 홈</a></p>
    </footer>
  </div>

</body>
</html>`;

    // 3) 물리적으로 HTML 파일 쓰기
    fs.writeFileSync(filePath, htmlTemplate, 'utf-8');
    console.log(`[HTML 빌더] 정적 HTML 저장 성공 (이미지 렌더 포함): ${filePath}`);

    // 🚀 [Git Auto Deploy] 생성된 패치노트 리포트를 GitHub 클라우드 저장소에 자동으로 푸시(push)합니다.
    const projectRoot = path.join(__dirname, '../../');
    try {
      console.log(`📡 [Git Auto Deploy] GitHub Pages 클라우드 서버로 배포(git push) 시작...`);
      execSync('git add public/rendered/', { cwd: projectRoot, stdio: 'ignore' });
      execSync(`git commit -m "chore: [Auto Deploy] LOL Patch ${patchVersion} Report Update"`, { cwd: projectRoot, stdio: 'ignore' });
      execSync('git push', { cwd: projectRoot, stdio: 'ignore' });
      console.log(`🟢 [Git Auto Deploy] GitHub 저장소 원격 push 성공! Pages 빌드가 깃허브 백그라운드에서 진행됩니다.`);
    } catch (gitErr) {
      console.warn(`⚠️ [Git Auto Deploy Warning] 자동 배포 도중 일시적 오류 발생 (로컬 파일 저장에 영향을 주지 않습니다):`, gitErr.message);
    }

    // 4) 🌐 깃허브 Pages 보안 HTTPS 외부 링크 자동 조립 및 반환 (전 세계 누구나, 모바일 즉시 렌더링 가능!)
    const username = process.env.GITHUB_USERNAME || 'Mid95';
    const repo = process.env.GITHUB_REPO || 'N_GameDiscordBot';
    const githubPagesUrl = `https://${username}.github.io/${repo}/public/rendered/${fileName}`;

    return githubPagesUrl;

  } catch (error) {
    console.error('[HTML Generator Error] ', error);
    throw error;
  }
}
