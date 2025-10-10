// src/services/telegramParser.ts

import * as cheerio from 'cheerio';
import type { ChannelInfo, MessageItem, ChannelData } from '@/types';

/**
 * 从 Telegram 频道的 HTML 内容中解析出频道信息和消息列表
 * @param html - 从 t.me/s/channel_username 获取的 HTML 字符串
 * @param channelUsername - 频道用户名
 * @returns 解析后的结构化频道数据
 */
export const parseTelegramChannel = (html: string, channelUsername: string): ChannelData => {
  const $ = cheerio.load(html);

  // 1. 解析频道基本信息 (无变动)
  const avatarUrl = $('.tgme_page_photo_image img').first().attr('src');
  const channelInfo: ChannelInfo = {
    title: $('.tgme_channel_info_header_title span').text().trim() || channelUsername,
    description: $('.tgme_channel_info_description').html()?.trim() ?? `Telegram 频道 ${channelUsername} 的 RSS 订阅源。`,
    link: `https://t.me/s/${channelUsername}`,
    author: $('.tgme_channel_info_header_title span').text().trim() || channelUsername,
    faviconUrl: avatarUrl,
  };

  // 2. 解析消息列表
  const items: MessageItem[] = [];
  $('.tgme_widget_message_wrap').each((_, element) => {
    const $message = $(element);
    const dataPost = $message.find('.js-widget_message').attr('data-post');
    if (!dataPost) return;

    const messageId = dataPost.split('/')[1];
    const messageLink = `https://t.me/${dataPost}`;

    const dateStr = $message.find('.tgme_widget_message_date time').attr('datetime');
    if (!dateStr) return;

    const messageDate = new Date(dateStr);

    let contentHtml = $message.find('.js-message_text').html() ?? '';
    const textContent = $message.find('.js-message_text').text().trim();

    // 视频处理逻辑 (无变动)
    const playableVideo = $message.find('video[src]');
    if (playableVideo.length > 0) {
      const videoUrl = playableVideo.attr('src');
      if (videoUrl) {
        contentHtml = `<video src="${videoUrl}" controls style="max-width: 100%; height: auto;"></video><br/>${contentHtml}`;
      }
    } else {
      const notSupportedMedia = $message.find('.message_media_not_supported');
      if (notSupportedMedia.length > 0) {
        const mediaWarningHtml = `<p><b>[此消息包含的媒体文件无法直接预览]</b></p><p><a href="${messageLink}">点击此处在 Telegram 中查看</a></p><br/>`;
        contentHtml = mediaWarningHtml + contentHtml;
      }
    }

    // --- START: 图片处理逻辑更新 ---

    // 初始化一个空数组来存储当前消息的所有图片 URL
    const imageUrls: string[] = [];

    // 查找并遍历所有 .tgme_widget_message_photo_wrap 元素
    $message.find('.tgme_widget_message_photo_wrap').each((_, photoElement) => {
      const style = $(photoElement).attr('style');
      const urlMatch = style?.match(/background-image:url\('(.+?)'\)/);
      if (urlMatch && urlMatch[1]) {
        imageUrls.push(urlMatch[1]);
      }
    });

    // --- END: 图片处理逻辑更新 ---

    // 生成标题节选 (无变动)
    const title = textContent.replace(/\n/g, ' ').substring(0, 20) + (textContent.length > 20 ? '...' : '');

    items.push({
      id: messageId,
      link: messageLink,
      date: messageDate,
      title: title || '无标题',
      contentHtml: contentHtml,
      imageUrls: imageUrls, // <-- 修改：传递图片URL数组
    });
  });

  return {
    info: channelInfo,
    items: items,
  };
};
