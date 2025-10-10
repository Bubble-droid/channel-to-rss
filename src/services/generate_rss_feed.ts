// src/utils/generate_rss_feed.ts

import { parseTelegramChannel, buildRssFeed } from '@/services';
import { fetchAsBrowser } from '@/utils';

/**
 * 为指定的 Telegram 频道生成 RSS feed
 * @param channelUsername - 频道的用户名
 * @returns 生成的 RSS XML 字符串
 * @throws 如果频道不存在或网络请求失败，则抛出错误
 */
export const generateRssFeed = async (channelUsername: string): Promise<string> => {
  const url = `https://t.me/s/${channelUsername}`;
  console.info(`正在抓取频道页面: ${url}`);

  const response = await fetchAsBrowser(url);

  if (!response.ok) {
    throw new Error(`无法访问频道 "${channelUsername}"。状态码: ${response.status}`);
  }

  const html = await response.text();

  console.info('页面抓取成功，开始解析...');
  const channelData = parseTelegramChannel(html, channelUsername);
  console.info(`解析完成，共找到 ${channelData.items.length} 条消息。`);

  console.info('开始构建 RSS feed...');
  const rssXml = buildRssFeed(channelData);
  console.info('RSS feed 构建完成。');

  return rssXml;
};
