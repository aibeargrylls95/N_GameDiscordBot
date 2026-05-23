import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// 1. .env 파일에 있는 환경변수 로드
dotenv.config();

// 2. 디스코드 봇 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,             // 서버(길드) 정보 접근
    GatewayIntentBits.GuildMessages,      // 서버 내 메시지 감지
    GatewayIntentBits.MessageContent,     // 메시지 내용 읽기 권한 (매크로 필수!)
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;

// 3. 봇이 정상적으로 로그인하여 실행 준비가 되었을 때의 이벤트
client.once('ready', () => {
  console.log('===================================================');
  console.log(`  🎮 N_GameDiscordBot이 성공적으로 시작되었습니다!`);
  console.log(`  🤖 봇 태그: ${client.user.tag}`);
  console.log(`  🟢 상태: 온라인 (Online) - '봇-응답' 채널 전용`);
  console.log('===================================================');
});

// 4. 서버에 새로운 메시지가 올라왔을 때 감지하여 반응하는 매크로 이벤트
client.on('messageCreate', async (message) => {
  // 봇이 자기 자신의 메시지에 응답하거나 다른 봇의 메시지이면 무시 (무한 루프 방지)
  if (message.author.bot) return;

  // 디렉트 메시지(DM)가 아니고 서버 채널이 아닌 경우 예외 처리
  if (!message.guild) return;

  // [요구사항 1] 채널명이 정확하게 '봇-응답'일 때만 아래 명령어들을 실행합니다.
  if (message.channel.name !== '봇-응답') return;

  // [기능 1] 봇 상태 및 안내 (요구사항: '봇 정보', '!봇정보', '!정보' 모두 대응)
  const isInfoCommand = 
    message.content === '봇 정보' || 
    message.content === '!봇정보' || 
    message.content === '!정보';

  if (isInfoCommand) {
    console.log(`[명령어] ${message.author.tag} 님이 봇 정보를 요청했습니다: ${message.content}`);
    const botInfo = 
      `🤖 **N_GameDiscordBot 정보 안내**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• **상태:** 🟢 정상 작동 중\n` +
      `• **허용 채널:** 💬 #봇-응답\n` +
      `• **언어:** JavaScript (Node.js + discord.js v14)\n` +
      `• **구동 환경:** 로컬 테스트 중 💻\n\n` +
      `📢 **사용 가능한 명령어 목록**\n` +
      `  - \`봇 정보\` / \`!봇정보\` / \`!정보\` : 봇의 명령어 안내판을 조회합니다.\n` +
      `  - \`!패치\` / \`!롤패치\` / \`!롤현재패치\` / \`!롤최근패치\` : 실시간 LOL 최신 패치노트를 조회합니다.\n` +
      `  - \`!지난패치\` / \`!이전패치\` : 실시간 바로 지난번 LOL 패치노트를 조회합니다.\n` +
      `  - \`!PS\` / \`!ps\` : LoL.PS 통신 분석 사이트 바로가기 링크를 제공합니다.\n` +
      `  - \`!OPGG\` / \`!opgg\` : OP.GG 전적 검색 사이트 바로가기 링크를 제공합니다.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    await message.reply(botInfo);
    return;
  }

  // [기능 2] LoL.PS 바로가기 (대소문자 무관 대응)
  if (message.content.toUpperCase() === '!PS') {
    console.log(`[명령어] ${message.author.tag} 님이 LoL.PS 링크를 요청했습니다.`);
    await message.reply('📊 **LoL.PS 챔피언 티어 및 분석 사이트 바로가기**\n🔗 https://lol.ps/statistics');
    return;
  }

  // [기능 3] OP.GG 바로가기 (대소문자 무관 대응)
  if (message.content.toUpperCase() === '!OPGG') {
    console.log(`[명령어] ${message.author.tag} 님이 OP.GG 링크를 요청했습니다.`);
    await message.reply('🔍 **OP.GG 전적 검색 및 챔피언 분석 사이트 바로가기**\n🔗 https://op.gg/ko');
    return;
  }

  // [기능 4] 최신/이전 롤 패치노트 실시간 크롤링 조회 통합 기능
  // ⭐ [요구사항] 단축어 '!패치'를 최신 패치노트 감지 조건에 추가했습니다.
  const isLolPatch = 
    message.content === '!롤패치' || 
    message.content === '!롤현재패치' || 
    message.content === '!롤최근패치' ||
    message.content === '!패치';
    
  const isLolPrevPatch = 
    message.content === '!지난패치' || 
    message.content === '!이전패치';

  if (isLolPatch || isLolPrevPatch) {
    console.log(`[명령어] ${message.author.tag} 님이 롤 패치 명령어를 입력했습니다: ${message.content}`);
    
    // 유저에게 잠시 통신 중임을 알릴 수 있도록 입력 중 상태 표시
    await message.channel.sendTyping();

    try {
      // 1) 롤 공식 홈페이지 게임 업데이트 뉴스 리스트 HTML을 가져옵니다.
      const response = await fetch('https://www.leagueoflegends.com/ko-kr/news/game-updates/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error('공식 홈페이지 접속 불량');
      }

      const html = await response.text();

      // 2) 정규표현식으로 패치노트 URL 리스트 추출
      const patchUrlRegex = /\/ko-kr\/news\/game-updates\/[a-zA-Z0-9-]*patch-[0-9a-zA-Z-]+-notes\/?/g;
      const matches = html.match(patchUrlRegex);

      if (!matches || matches.length === 0) {
        throw new Error('HTML에서 패치노트 URL 매칭 실패');
      }

      // 중복 링크들을 필터링하여 순수한 고유 순서 배열을 만듭니다.
      const uniqueMatches = [...new Set(matches)];

      // 3) 최신 패치 또는 지난 패치 분기 처리
      let targetPath = '';
      let patchTitleLabel = '';

      if (isLolPatch) {
        // [최신 패치]: 첫 번째 항목
        targetPath = uniqueMatches[0];
        patchTitleLabel = '최신 릴리즈';
      } else {
        // [지난 패치]: 두 번째 항목
        if (uniqueMatches.length < 2) {
          await message.reply('❌ 현재 공식 홈페이지 목록에서 이전 패치노트 링크를 찾을 수 없습니다.');
          return;
        }
        targetPath = uniqueMatches[1];
        patchTitleLabel = '바로 지난번(이전)';
      }

      const fullUrl = `https://www.leagueoflegends.com${targetPath}`;

      // 4) 가져온 실제 URL에서 버전 명칭 역추적 파싱 (예: "patch-26-10-notes" -> "26.10 패치")
      const versionMatch = targetPath.match(/patch-(\d+)-(\d+)-notes/);
      let patchDisplayName = '패치';
      
      if (versionMatch && versionMatch.length >= 3) {
        patchDisplayName = `${versionMatch[1]}.${versionMatch[2]} 패치`;
      }

      // 5) 디스코드 응답 전송
      const lolPatchReply = 
        `🏆 **League of Legends 실시간 패치 정보**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• **인식 영역:** **${patchTitleLabel}**\n` +
        `• **해당 패치 버전:** **${patchDisplayName}**\n` +
        `• **공식 한글 패치노트 바로가기:**\n` +
        `🔗 ${fullUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*※ 공식 홈페이지에서 1초 만에 실시간 크롤링하여 정확한 한글 패치 정보를 보장합니다.*`;

      await message.reply(lolPatchReply);
      console.log(`[성공] 패치노트 링크 전송 완료 (${patchTitleLabel}): ${fullUrl}`);

    } catch (error) {
      console.error('롤 패치 크롤링 에러:', error);
      await message.reply('❌ 롤 공식 홈페이지로부터 패치 소식을 긁어오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    return;
  }
});

// 5. 토큰 값 유효성 체크 및 로그인 실행
if (!TOKEN || TOKEN === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
  console.error('===================================================');
  console.error('❌ 에러: .env 파일에 디스코드 봇 토큰이 설정되지 않았습니다.');
  console.error('   N_GameDiscordBot 폴더 안의 .env 파일을 열고');
  console.error('   DISCORD_TOKEN= 옆에 발급받으신 토큰을 붙여넣어 주세요.');
  console.error('===================================================');
} else {
  client.login(TOKEN).catch((err) => {
    console.error('===================================================');
    console.error('❌ 디스코드 로그인 실패: 토큰이 유효하지 않습니다.');
    console.error('   발급받으신 봇 토큰 값을 다시 확인해 주세요.');
    console.error('===================================================');
    console.error(err);
  });
}
