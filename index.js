import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { handleLolPatchCommand } from './src/commands/lolPatch.js';

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
  console.log(`  🟢 상태: 온라인 (Online) - 모듈형 아키텍처 가동 중`);
  console.log('===================================================');
});

// 4. 서버에 새로운 메시지가 올라왔을 때 감지하여 반응하는 이벤트 허브
client.on('messageCreate', async (message) => {
  // 봇이 자기 자신의 메시지에 응답하거나 다른 봇의 메시지이면 무시 (무한 루프 방지)
  if (message.author.bot) return;

  // 디렉트 메시지(DM)가 아니고 서버 채널이 아닌 경우 예외 처리
  if (!message.guild) return;

  // [요구사항 1] 채널명이 정확하게 '봇-응답'일 때만 아래 명령어들을 실행합니다.
  if (message.channel.name !== '봇-응답') return;

  // [기능 1] 봇 상태 및 명령어 안내판 조회
  const isInfoCommand = 
    message.content === '봇 정보' || 
    message.content === '!봇정보' || 
    message.content === '!정보';

  if (isInfoCommand) {
    console.log(`[명령어] ${message.author.tag} 님이 봇 정보를 요청했습니다: ${message.content}`);
    const botInfo = 
      `🤖 **N_GameDiscordBot 정보 안내**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• **상태:** 🟢 정상 작동 중 (클린 아키텍처)\n` +
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

  // [기능 4] 최신 롤 패치 조회 매크로
  const isLolPatch = 
    message.content === '!롤패치' || 
    message.content === '!롤현재패치' || 
    message.content === '!롤최근패치' ||
    message.content === '!패치';

  if (isLolPatch) {
    // ⚙️ [역할 분리] 실제 비즈니스 시나리오는 lolPatch.js 컨트롤러에게 전적으로 대행 위임!
    await handleLolPatchCommand(message, false);
    return;
  }

  // [기능 5] 지난 롤 패치 조회 매크로
  const isLolPrevPatch = 
    message.content === '!지난패치' || 
    message.content === '!이전패치';

  if (isLolPrevPatch) {
    // ⚙️ [역할 분리] 실제 비즈니스 시나리오는 lolPatch.js 컨트롤러에게 전적으로 대행 위임!
    await handleLolPatchCommand(message, true);
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
