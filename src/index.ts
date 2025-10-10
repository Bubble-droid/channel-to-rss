import { isValidTelegramUsername } from '@/utils';
import { generateRssFeed } from '@/services';

const Worker: ExportedHandler<Env> = {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname || '/';
    const pathSegments = path.replace(/^\/|\/$/g, '').split('/');

    // 校验第1步：检查路径结构是否为单一分段
    if (pathSegments.length !== 1 || pathSegments[0] === '') {
      const errorMessage = `请求路径格式不正确，应为 "/{channel_username}"`;
      console.warn(`[请求校验失败] 无效的路径结构: ${path}`);
      return new Response(errorMessage, {
        status: 400,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
    }

    const channelUsername = pathSegments[0];

    // 校验第2步：使用正则表达式检查用户名格式是否合法
    if (!isValidTelegramUsername(channelUsername)) {
      const errorMessage = `请求的频道名 "${channelUsername}" 格式无效。用户名必须为5-32个字符，以字母开头，且只能包含字母、数字和下划线。`;
      console.warn(`[请求校验失败] 无效的用户名格式: ${channelUsername}`);
      return new Response(errorMessage, {
        status: 400,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
    }

    console.info(`[请求开始] 频道名 ${channelUsername} 格式校验通过。`);

    try {
      const rssResult = await generateRssFeed(channelUsername);
      console.info(`[请求成功] 为频道 ${channelUsername} 成功生成 RSS feed。`);
      return new Response(rssResult, {
        status: 200,
        headers: { 'Content-Type': 'application/xml;charset=utf-8' },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      console.error(`[请求失败] 处理频道 ${channelUsername} 时出错: ${errorMessage}`);
      return new Response(`内部服务器错误: ${errorMessage}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
    }
  },
};

export default Worker;
