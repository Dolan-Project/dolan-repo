import { Op } from "sequelize";
import { UserBlock, UserFollow, UserReview } from "@dolan/database";
import { TripErrorCode } from "@dolan/shared";
import { badRequest, conflict } from "../../lib/api-error.ts";

export type SocialError = "SELF_FOLLOW" | "SELF_BLOCK" | "ALREADY_FOLLOWING" | "BLOCKED_RELATION";

export type FollowRecord = {
  followerUserId: string;
  followingUserId: string;
};

export type BlockRecord = {
  blockerUserId: string;
  blockedUserId: string;
};

export type ReviewAggregate = {
  overall: number | null;
  communication: number | null;
  attitude: number | null;
  reviewCount: number;
};

export interface SocialQueryStore {
  follow(followerUserId: string, followingUserId: string): Promise<FollowRecord>;
  unfollow(followerUserId: string, followingUserId: string): Promise<boolean>;
  countFollowers(userId: string): Promise<number>;
  countFollowing(userId: string): Promise<number>;
  listFollowerIds(userId: string): Promise<string[]>;
  listFollowingIds(userId: string): Promise<string[]>;
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
  block(blockerUserId: string, blockedUserId: string): Promise<BlockRecord>;
  unblock(blockerUserId: string, blockedUserId: string): Promise<boolean>;
  removeFollowsBetween(userA: string, userB: string): Promise<number>;
  ratingFor(userId: string): Promise<ReviewAggregate>;
}

function rejectSelf(left: string, right: string, code: SocialError, message: string) {
  if (left === right) throw badRequest(code, message);
}

export class MemorySocialStore implements SocialQueryStore {
  readonly follows: FollowRecord[] = [];
  readonly blocks: BlockRecord[] = [];
  readonly reviews: Array<{
    revieweeUserId: string;
    communicationRating: number;
    attitudeRating: number;
    moderationStatus: string;
  }> = [];

  async follow(followerUserId: string, followingUserId: string) {
    rejectSelf(followerUserId, followingUserId, "SELF_FOLLOW", "Users cannot follow themselves");
    if (await this.isBlockedEitherWay(followerUserId, followingUserId)) {
      throw conflict(TripErrorCode.BLOCKED_RELATION, "Blocked users cannot follow each other");
    }
    if (this.follows.some((row) => row.followerUserId === followerUserId && row.followingUserId === followingUserId)) {
      throw conflict("ALREADY_FOLLOWING", "Already following this user");
    }
    const row = { followerUserId, followingUserId };
    this.follows.push(row);
    return row;
  }

  async unfollow(followerUserId: string, followingUserId: string) {
    const index = this.follows.findIndex(
      (row) => row.followerUserId === followerUserId && row.followingUserId === followingUserId,
    );
    if (index < 0) return false;
    this.follows.splice(index, 1);
    return true;
  }

  async countFollowers(userId: string) {
    return this.follows.filter((row) => row.followingUserId === userId).length;
  }

  async countFollowing(userId: string) {
    return this.follows.filter((row) => row.followerUserId === userId).length;
  }

  async listFollowerIds(userId: string) {
    return this.follows.filter((row) => row.followingUserId === userId).map((row) => row.followerUserId);
  }

  async listFollowingIds(userId: string) {
    return this.follows.filter((row) => row.followerUserId === userId).map((row) => row.followingUserId);
  }

  async isBlockedEitherWay(userA: string, userB: string) {
    return this.blocks.some(
      (row) =>
        (row.blockerUserId === userA && row.blockedUserId === userB) ||
        (row.blockerUserId === userB && row.blockedUserId === userA),
    );
  }

  async block(blockerUserId: string, blockedUserId: string) {
    rejectSelf(blockerUserId, blockedUserId, "SELF_BLOCK", "Users cannot block themselves");
    const existing = this.blocks.find(
      (row) => row.blockerUserId === blockerUserId && row.blockedUserId === blockedUserId,
    );
    if (existing) return existing;
    const row = { blockerUserId, blockedUserId };
    this.blocks.push(row);
    await this.removeFollowsBetween(blockerUserId, blockedUserId);
    return row;
  }

  async unblock(blockerUserId: string, blockedUserId: string) {
    const index = this.blocks.findIndex(
      (row) => row.blockerUserId === blockerUserId && row.blockedUserId === blockedUserId,
    );
    if (index < 0) return false;
    this.blocks.splice(index, 1);
    return true;
  }

  async removeFollowsBetween(userA: string, userB: string) {
    const before = this.follows.length;
    this.follows.splice(
      0,
      this.follows.length,
      ...this.follows.filter(
        (row) =>
          !(
            (row.followerUserId === userA && row.followingUserId === userB) ||
            (row.followerUserId === userB && row.followingUserId === userA)
          ),
      ),
    );
    return before - this.follows.length;
  }

  async ratingFor(userId: string): Promise<ReviewAggregate> {
    const rows = this.reviews.filter((row) => row.revieweeUserId === userId && row.moderationStatus === "VISIBLE");
    return averageRatings(rows);
  }
}

export class SequelizeSocialStore implements SocialQueryStore {
  async follow(followerUserId: string, followingUserId: string) {
    rejectSelf(followerUserId, followingUserId, "SELF_FOLLOW", "Users cannot follow themselves");
    if (await this.isBlockedEitherWay(followerUserId, followingUserId)) {
      throw conflict(TripErrorCode.BLOCKED_RELATION, "Blocked users cannot follow each other");
    }
    try {
      const row = await UserFollow.create({ followerUserId, followingUserId });
      return { followerUserId: row.followerUserId, followingUserId: row.followingUserId };
    } catch {
      throw conflict("ALREADY_FOLLOWING", "Already following this user");
    }
  }

  async unfollow(followerUserId: string, followingUserId: string) {
    const deleted = await UserFollow.destroy({ where: { followerUserId, followingUserId } });
    return deleted > 0;
  }

  async countFollowers(userId: string) {
    return UserFollow.count({ where: { followingUserId: userId } });
  }

  async countFollowing(userId: string) {
    return UserFollow.count({ where: { followerUserId: userId } });
  }

  async listFollowerIds(userId: string) {
    const rows = await UserFollow.findAll({ where: { followingUserId: userId } });
    return rows.map((row) => row.followerUserId);
  }

  async listFollowingIds(userId: string) {
    const rows = await UserFollow.findAll({ where: { followerUserId: userId } });
    return rows.map((row) => row.followingUserId);
  }

  async isBlockedEitherWay(userA: string, userB: string) {
    const count = await UserBlock.count({
      where: {
        [Op.or]: [
          { blockerUserId: userA, blockedUserId: userB },
          { blockerUserId: userB, blockedUserId: userA },
        ],
      },
    });
    return count > 0;
  }

  async block(blockerUserId: string, blockedUserId: string) {
    rejectSelf(blockerUserId, blockedUserId, "SELF_BLOCK", "Users cannot block themselves");
    const [row] = await UserBlock.findOrCreate({
      where: { blockerUserId, blockedUserId },
      defaults: { blockerUserId, blockedUserId },
    });
    await this.removeFollowsBetween(blockerUserId, blockedUserId);
    return { blockerUserId: row.blockerUserId, blockedUserId: row.blockedUserId };
  }

  async unblock(blockerUserId: string, blockedUserId: string) {
    const deleted = await UserBlock.destroy({ where: { blockerUserId, blockedUserId } });
    return deleted > 0;
  }

  async removeFollowsBetween(userA: string, userB: string) {
    const first = await UserFollow.destroy({ where: { followerUserId: userA, followingUserId: userB } });
    const second = await UserFollow.destroy({ where: { followerUserId: userB, followingUserId: userA } });
    return first + second;
  }

  async ratingFor(userId: string): Promise<ReviewAggregate> {
    const rows = await UserReview.findAll({
      where: { revieweeUserId: userId, moderationStatus: "VISIBLE" },
    });
    return averageRatings(rows);
  }
}

function averageRatings(
  rows: Array<{ communicationRating: number; attitudeRating: number }>,
): ReviewAggregate {
  if (rows.length === 0) {
    return { overall: null, communication: null, attitude: null, reviewCount: 0 };
  }
  const communication = rows.reduce((sum, row) => sum + row.communicationRating, 0) / rows.length;
  const attitude = rows.reduce((sum, row) => sum + row.attitudeRating, 0) / rows.length;
  return {
    overall: Number(((communication + attitude) / 2).toFixed(2)),
    communication: Number(communication.toFixed(2)),
    attitude: Number(attitude.toFixed(2)),
    reviewCount: rows.length,
  };
}
