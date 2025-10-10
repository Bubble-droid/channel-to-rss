/**
 * @description 频道的基本信息
 */
export interface ChannelInfo {
  title: string;
  description: string;
  link: string;
  author: string;
  faviconUrl?: string;
}

/**
 * @description 单条消息的结构化数据
 */
export interface MessageItem {
  id: string;
  link: string;
  date: Date;
  title: string; // 消息内容的节选
  contentHtml: string; // 完整的消息HTML内容
  imageUrls: string[];
}

/**
 * @description 从HTML解析出的完整频道数据
 */
export interface ChannelData {
  info: ChannelInfo;
  items: MessageItem[];
}
