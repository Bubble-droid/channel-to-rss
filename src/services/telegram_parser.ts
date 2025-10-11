// src/services/telegramParser.ts

import * as cheerio from 'cheerio';
import type { ChannelInfo, MessageItem, ChannelData } from '@/types';

/**
 * 清理消息内容的HTML，移除有害属性、转换标签链接和非标准标签。
 * @param html - 原始的消息HTML字符串。
 * @returns 清理和处理后的HTML字符串。
 */
const sanitizeContentHtml = (html: string | null): string => {
  if (!html) return '';

  const $ = cheerio.load(html, null, false);

  $('a').each((_, element) => {
    const $link = $(element);
    const href = $link.attr('href');

    if (href && href.startsWith('?q=')) {
      $link.replaceWith(`<strong>${$link.text()}</strong>`);
      return;
    }

    $link.removeAttr('onclick');
    $link.attr('target', '_blank');
    $link.attr('rel', 'noopener noreferrer');
  });

  $('tg-emoji').each((_, element) => {
    const $emoji = $(element);
    $emoji.replaceWith($emoji.text());
  });

  return $.html();
};

/**
 * 从 Telegram 频道的 HTML 内容中解析出频道信息和消息列表
 * @param html - 从 t.me/s/channel_username 获取的 HTML 字符串
 * @param channelUsername - 频道用户名
 * @returns 解析后的结构化频道数据
 */
export const parseTelegramChannel = (html: string, channelUsername: string): ChannelData => {
  const $ = cheerio.load(html);

  const avatarUrl = $('.tgme_page_photo_image img').first().attr('src');
  const channelInfo: ChannelInfo = {
    title: $('.tgme_channel_info_header_title span').text().trim() || channelUsername,
    description: $('.tgme_channel_info_description').html()?.trim() ?? `Telegram 频道 ${channelUsername} 的 RSS 订阅源。`,
    link: `https://t.me/s/${channelUsername}`,
    author: $('.tgme_channel_info_header_title span').text().trim() || channelUsername,
    faviconUrl: avatarUrl,
  };

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

    const rawContentHtml = $message.find('.js-message_text').html();
    let finalContentHtml = sanitizeContentHtml(rawContentHtml);
    const textContent = $message.find('.js-message_text').text().trim();

    // 1. 文件和音频附件
    const $document = $message.find('a.tgme_widget_message_document_wrap');
    if ($document.length > 0) {
      const title = $document.find('.tgme_widget_message_document_title').text().trim();
      const extra = $document.find('.tgme_widget_message_document_extra').text().trim();
      const docType = $document.find('.audio').length > 0 ? '音频' : '文件';

      const documentHtml = `
        <div style="max-width: 600px; margin: 1em auto; padding: 0.8em; border: 1px solid #ddd; border-radius: 8px; font-family: sans-serif; text-align: center;">
          <p><strong>[此消息包含一个${docType}]</strong></p>
          <p><strong>名称:</strong> ${title}</p>
          ${extra ? `<p><strong>大小:</strong> ${extra}</p>` : ''}
          <p><a href="${messageLink}" target="_blank" rel="noopener noreferrer">点击此处在 Telegram 中查看</a></p>
        </div>
      `;
      finalContentHtml = documentHtml + finalContentHtml;
    }

    // 2. 可播放视频
    const playableVideo = $message.find('video[src]');
    if (playableVideo.length > 0) {
      const videoUrl = playableVideo.attr('src');
      if (videoUrl) {
        const videoHtml = `
         <div style="max-width: 600px; margin: 1em auto; padding: 0.8em; border: 1px solid #ddd; border-radius: 8px; font-family: sans-serif; text-align: center;">
            <video src="${videoUrl}" controls allowfullscreen style="width: 100%; aspect-ratio: 16 / 9; display: block; border: none; background-color: #000;"></video>
            <p style="margin-top: 1em; margin-bottom: 0; text-align: center; color: #555;">
              <a href="${messageLink}" target="_blank" rel="noopener noreferrer">点击此处在 Telegram 中查看</a>
            </p>
          </div>
        `;
        finalContentHtml = videoHtml + finalContentHtml;
      }
    }

    // 3. 无法预览的媒体
    const notSupportedMedia = $message.find('.not_supported');
    if (notSupportedMedia.length > 0) {
      const duration = $message.find('.message_video_duration').text().trim();
      const mediaWarningHtml = `
        <div style="max-width: 600px; margin: 1em auto; padding: 0.8em; border: 1px solid #ddd; border-radius: 8px; font-family: sans-serif; text-align: center;">
          <p><strong>[此消息包含一个无法预览的视频]</strong></p>
          ${duration ? `<p><strong>时长:</strong> ${duration}</p>` : ''}
          <p><a href="${messageLink}" target="_blank" rel="noopener noreferrer">点击此处在 Telegram 中查看</a></p>
        </div>
      `;
      finalContentHtml = mediaWarningHtml + finalContentHtml;
    }

    // 3. 处理多图片消息
    const imageUrls: string[] = [];
    $message.find('.tgme_widget_message_photo_wrap').each((_, photoElement) => {
      const style = $(photoElement).attr('style');
      const urlMatch = style?.match(/background-image:url\('(.+?)'\)/);
      if (urlMatch && urlMatch[1]) {
        imageUrls.push(urlMatch[1]);
      }
    });

    // 4. 解析链接预览卡片
    const $linkPreview = $message.find('a.tgme_widget_message_link_preview');
    if ($linkPreview.length > 0) {
      const previewUrl = $linkPreview.attr('href') || '';
      const siteName = $linkPreview.find('.link_preview_site_name').text().trim();
      const title = $linkPreview.find('.link_preview_title').text().trim();
      const description = sanitizeContentHtml($linkPreview.find('.link_preview_description').html());

      let imageUrl: string | undefined;
      // 使用组合选择器，匹配两种可能的图片类名
      const $imageElement = $linkPreview.find('.link_preview_image, .link_preview_right_image');
      if ($imageElement.length > 0) {
        const style = $imageElement.attr('style');
        const urlMatch = style?.match(/background-image:url\('(.+?)'\)/);
        if (urlMatch && urlMatch[1]) {
          imageUrl = urlMatch[1];
        }
      }

      // 预览卡片的HTML结构 (根据图片类型调整)
      const isFullWidthImage = $imageElement.hasClass('link_preview_image');
      const imageHtml = imageUrl
        ? isFullWidthImage
          ? `<img src="${imageUrl}" alt="链接预览图" style="width: 100%; height: auto; display: block; border-radius: 8px 8px 0 0;">` // 顶部大图样式
          : `<img src="${imageUrl}" alt="链接预览图" style="max-width: 150px; float: right; margin-left: 1em; border-radius: 4px;">` // 右侧小图样式
        : '';

      const contentPadding = isFullWidthImage ? 'padding: 0.8em;' : '';

      const previewHtml = `
        <hr>
        <div style="margin-top: 1em; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; font-family: sans-serif;">
          <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: block;">
            ${imageHtml}
            <div style="${contentPadding}">
              <strong style="display: block; color: #005a9c; margin-top: ${isFullWidthImage ? '0.5em' : '0'};">${siteName}</strong>
              <strong style="display: block; margin-top: 0.3em; font-size: 1.1em;">${title}</strong>
              <p style="margin-top: 0.5em; font-size: 0.9em; color: #555; margin-bottom: 0;">${description}</p>
            </div>
          </a>
        </div>
      `;
      finalContentHtml += previewHtml;
    }

    const title = textContent.replace(/\n/g, ' ').substring(0, 20) + (textContent.length > 20 ? '...' : '');

    items.push({
      id: messageId,
      link: messageLink,
      date: messageDate,
      title: title || '无标题',
      contentHtml: finalContentHtml,
      imageUrls: imageUrls,
    });
  });

  return { info: channelInfo, items };
};
