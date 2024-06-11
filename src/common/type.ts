import { ScrapeOptions } from "scrape-it";

export interface IScrapeResult {
  content: Record<string, string>[];
}

export interface ISiteConfig {
  url: string;
  filter: Record<string, string[]>;
  format: string;
  instructions: ScrapeOptions;
}

export interface File {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
}

export interface User {
  name: string | null;
  email: string | null;
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  starred_at: string;
}

export interface Gist {
  url: string;
  forks_url: string;
  commits_url: string;
  id: string;
  node_id: string;
  git_pull_url: string;
  git_push_url: string;
  html_url: string;
  files: { [key: string]: File };
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string | null;
  comments: number;
  user: User | null;
  comments_url: string;
  owner: User;
}

export type Gists = Gist[];
