// src/services/rss_builder.ts

import { Feed } from 'feed';
import type { ChannelData } from '@/types';

/**
 * 根据解析后的频道数据构建 RSS 2.0 feed
 * @param data - 包含频道信息和消息列表的结构化数据
 * @returns 生成的 RSS XML 字符串
 */
export const buildRssFeed = (data: ChannelData): string => {
  const feed = new Feed({
    title: data.info.title,
    description: data.info.description,
    id: data.info.link,
    link: data.info.link,
    language: 'zh-CN',
    image: data.info.faviconUrl,
    favicon: data.info.faviconUrl,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${data.info.author}`,
    updated: new Date(),
    generator: 'Node.js Feed Generator by Code Expert',
    author: {
      name: data.info.author,
    },
  });

  data.items.forEach((item) => {
    let finalContent = item.contentHtml;

    // 如果存在图片，将它们转换为 <img> 标签字符串
    if (item.imageUrls.length > 0) {
      const imagesHtml = item.imageUrls
        .map((url) => `<img src="${url}" alt="消息图片" style="max-width: 100%; height: auto; display: block; margin-bottom: 10px;" /><br />`)
        .join('');

      // 将所有图片 HTML 插入到原始内容的顶部
      finalContent = imagesHtml + finalContent;
    }

    const finalContentWrapped = `
      <div style="overflow-wrap: break-word; word-wrap: break-word;">
        ${finalContent}
      </div>
    `;

    feed.addItem({
      title: item.title,
      id: item.link,
      link: item.link,
      description: '',
      content: finalContentWrapped,
      author: [{ name: data.info.author }],
      date: item.date,
      // 将第一张图片作为 feed item 的主图，用于封面或摘要显示
      image: item.imageUrls.length > 0 ? item.imageUrls[0] : undefined,
    });
  });

  return feed.rss2();
};
