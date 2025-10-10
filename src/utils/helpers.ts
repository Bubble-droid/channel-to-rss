/**
 * @description 验证给定的字符串是否为有效的 Telegram 频道用户名。
 * 规则:
 * 1. 长度为 5-32 个字符。
 * 2. 以字母开头。
 * 3. 只能包含字母 (a-z, A-Z)、数字 (0-9) 和下划线 (_)。
 * @param username - 待验证的用户名字符串。
 * @returns 如果用户名有效则返回 true，否则返回 false。
 */
export const isValidTelegramUsername = (username: string): boolean => {
  // 正则表达式，严格匹配 Telegram 用户名格式
  // ^[a-zA-Z]      - 必须以一个字母开头
  // [a-zA-Z0-9_]{4,31} - 后面跟随 4 到 31 个字母、数字或下划线
  // $              - 字符串结尾
  // 总长度加起来即为 5-32 个字符
  const telegramUsernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
  return telegramUsernameRegex.test(username);
};

/**
 * 模拟浏览器发送 GET 请求
 * @param {string} targetUrl - 要访问的 URL
 * @returns {Promise<Response>} - node-fetch 的 Response 对象
 */
export const fetchAsBrowser = async (targetUrl: string): Promise<Response> => {
  // 1. 设置更真实的请求头
  const headers = new Headers({
    // Windows 10, Chrome 123 真实 User-Agent
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0',
    // 接受 HTML、XML、XHTML、webp、apng，以及通配符
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    // 浏览器通常会指定它偏好的语言
    'Accept-Language': 'zh-CN,zh-TW;q=0.7,en-US;q=0.3',
    // 告知服务器保持连接打开，这是真实浏览器行为
    Connection: 'keep-alive',
    // 指示浏览器可以处理的压缩类型
    'Accept-Encoding': 'br, gzip',
    // 告诉服务器这是从顶层导航来的请求
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1', // 告知服务器客户端更喜欢安全的（HTTPS）连接
  });

  console.info(`正在请求: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: headers,
      // 保持重定向跟踪
      redirect: 'follow',
    });

    console.info(`请求状态: ${response.status} ${response.statusText}`);
    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '发生未知错误';
    console.error(`请求失败: ${errorMessage}`);
    throw err;
  }
};
