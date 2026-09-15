import type { PublicUser } from "./kickoff.js";
import type { ItineraryTemplateSummary } from "./template.ts";

export type PostTripRef = {
  id: string;
  title: string;
};

export type PostCard = {
  id: string;
  caption: string;
  imageUrl: string;
  author: PublicUser;
  trip: PostTripRef | null;
  template: ItineraryTemplateSummary | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: PostComment[];
  createdAt: string;
};

export type PostComment = {
  id: string;
  postId: string;
  author: PublicUser;
  body: string;
  createdAt: string;
};

export type HomeStreamItem =
  | { kind: "post"; post: PostCard }
  | { kind: "plan"; template: ItineraryTemplateSummary };

export type HomeComposerOptions = {
  trips: PostTripRef[];
  templates: ItineraryTemplateSummary[];
};
