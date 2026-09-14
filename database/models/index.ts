import type { Sequelize } from "sequelize";
import { getSequelize } from "../src/connection.ts";
import { initUserModel, User } from "./user.ts";
import { initUserProfileModel, UserProfile } from "./user-profile.ts";
import {
  AuthSession,
  initAuthSessionModels,
  PasswordResetToken,
  EmailVerificationToken,
} from "./auth-session.ts";
import { initPlaceModel, Place } from "./place.ts";
import { initProvinceModels, Province, ProvincePlace } from "./province.ts";
import {
  initTemplateModels,
  ItineraryTemplate,
  TemplateDay,
  TemplateStop,
  TemplateUsage,
} from "./template.ts";
import { initTripModels, Trip, TripJoinRequest, TripMember } from "./trip.ts";
import {
  BudgetItem,
  initItineraryModels,
  ItineraryDay,
  ItineraryStop,
  ItineraryVersion,
  TripChecklistItem,
} from "./itinerary.ts";
import {
  ChatRoom,
  initCommunicationModels,
  Message,
  MessageReadState,
  Notification,
  PushSubscription,
  TripComment,
} from "./communication.ts";
import {
  initSocialModels,
  LocationLatest,
  LocationShare,
  ModerationAction,
  Report,
  UserBlock,
  UserFollow,
  UserReview,
} from "./social.ts";
import {
  ApiUsageCounter,
  GenerationJob,
  IdempotencyKey,
  initSupportModels,
  TripShareLink,
  TripInvitation,
} from "./support.ts";

let initialized = false;

function applyAssociations() {
  User.hasOne(UserProfile, { foreignKey: "userId", as: "profile" });
  UserProfile.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(AuthSession, { foreignKey: "userId", as: "authSessions" });
  AuthSession.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(PasswordResetToken, { foreignKey: "userId", as: "passwordResetTokens" });
  PasswordResetToken.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasMany(EmailVerificationToken, { foreignKey: "userId", as: "emailVerificationTokens" });
  EmailVerificationToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(Trip, { foreignKey: "hostUserId", as: "hostedTrips" });
  Trip.belongsTo(User, { foreignKey: "hostUserId", as: "host" });

  User.hasMany(TripMember, { foreignKey: "userId", as: "memberships" });
  TripMember.belongsTo(User, { foreignKey: "userId", as: "user" });
  Trip.hasMany(TripMember, { foreignKey: "tripId", as: "members" });
  TripMember.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });

  Trip.hasMany(TripJoinRequest, { foreignKey: "tripId", as: "joinRequests" });
  TripJoinRequest.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  TripJoinRequest.belongsTo(User, { foreignKey: "userId", as: "user" });
  TripJoinRequest.belongsTo(User, {
    foreignKey: "reviewedByUserId",
    as: "reviewer",
  });

  Trip.hasMany(ItineraryVersion, { foreignKey: "tripId", as: "itineraryVersions" });
  ItineraryVersion.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  ItineraryVersion.belongsTo(User, {
    foreignKey: "createdByUserId",
    as: "createdBy",
  });
  Trip.belongsTo(ItineraryVersion, {
    foreignKey: "currentItineraryVersionId",
    as: "currentItineraryVersion",
  });

  ItineraryVersion.hasMany(ItineraryDay, {
    foreignKey: "itineraryVersionId",
    as: "days",
  });
  ItineraryDay.belongsTo(ItineraryVersion, {
    foreignKey: "itineraryVersionId",
    as: "version",
  });
  ItineraryDay.hasMany(ItineraryStop, {
    foreignKey: "itineraryDayId",
    as: "stops",
  });
  ItineraryStop.belongsTo(ItineraryDay, {
    foreignKey: "itineraryDayId",
    as: "day",
  });
  ItineraryStop.belongsTo(Place, { foreignKey: "placeId", as: "place" });

  ItineraryVersion.hasMany(BudgetItem, {
    foreignKey: "itineraryVersionId",
    as: "budgetItems",
  });
  BudgetItem.belongsTo(ItineraryVersion, {
    foreignKey: "itineraryVersionId",
    as: "version",
  });
  BudgetItem.belongsTo(ItineraryStop, {
    foreignKey: "itineraryStopId",
    as: "stop",
  });

  Trip.hasMany(TripChecklistItem, { foreignKey: "tripId", as: "checklistItems" });
  TripChecklistItem.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  TripChecklistItem.belongsTo(User, { foreignKey: "userId", as: "owner" });

  Place.hasMany(ItineraryTemplate, { foreignKey: "coverPlaceId", as: "coverTemplates" });
  Province.hasMany(ProvincePlace, { foreignKey: "provinceId", as: "places" });
  ProvincePlace.belongsTo(Province, { foreignKey: "provinceId", as: "province" });
  Province.hasMany(ItineraryTemplate, { foreignKey: "provinceId", as: "templates" });
  ItineraryTemplate.belongsTo(Province, { foreignKey: "provinceId", as: "province" });
  ItineraryTemplate.belongsTo(Place, { foreignKey: "coverPlaceId", as: "coverPlace" });
  ItineraryTemplate.belongsTo(User, { foreignKey: "creatorUserId", as: "creator" });
  ItineraryTemplate.belongsTo(Trip, { foreignKey: "sourceTripId", as: "sourceTrip" });
  ItineraryTemplate.hasMany(TemplateDay, { foreignKey: "templateId", as: "days" });
  TemplateDay.belongsTo(ItineraryTemplate, { foreignKey: "templateId", as: "template" });
  TemplateDay.hasMany(TemplateStop, { foreignKey: "templateDayId", as: "stops" });
  TemplateStop.belongsTo(TemplateDay, { foreignKey: "templateDayId", as: "day" });
  TemplateStop.belongsTo(Place, { foreignKey: "placeId", as: "place" });

  ItineraryTemplate.hasMany(TemplateUsage, { foreignKey: "templateId", as: "usages" });
  TemplateUsage.belongsTo(ItineraryTemplate, { foreignKey: "templateId", as: "template" });
  TemplateUsage.belongsTo(User, { foreignKey: "userId", as: "user" });
  TemplateUsage.belongsTo(Trip, { foreignKey: "createdTripId", as: "createdTrip" });

  Trip.hasMany(TripComment, { foreignKey: "tripId", as: "comments" });
  TripComment.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  TripComment.belongsTo(User, { foreignKey: "userId", as: "author" });
  TripComment.belongsTo(TripComment, {
    foreignKey: "parentCommentId",
    as: "parent",
  });
  TripComment.hasMany(TripComment, {
    foreignKey: "parentCommentId",
    as: "replies",
  });

  Trip.hasOne(ChatRoom, { foreignKey: "tripId", as: "chatRoom" });
  ChatRoom.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  ChatRoom.hasMany(Message, { foreignKey: "chatRoomId", as: "messages" });
  Message.belongsTo(ChatRoom, { foreignKey: "chatRoomId", as: "room" });
  Message.belongsTo(User, { foreignKey: "senderUserId", as: "sender" });
  ChatRoom.hasMany(MessageReadState, { foreignKey: "chatRoomId", as: "readStates" });
  MessageReadState.belongsTo(ChatRoom, { foreignKey: "chatRoomId", as: "room" });
  MessageReadState.belongsTo(User, { foreignKey: "userId", as: "user" });
  MessageReadState.belongsTo(Message, {
    foreignKey: "lastReadMessageId",
    as: "lastReadMessage",
  });

  User.hasMany(Notification, { foreignKey: "recipientUserId", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "recipientUserId", as: "recipient" });
  Notification.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });
  User.hasMany(PushSubscription, { foreignKey: "userId", as: "pushSubscriptions" });
  PushSubscription.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(UserFollow, { foreignKey: "followerUserId", as: "following" });
  User.hasMany(UserFollow, { foreignKey: "followingUserId", as: "followers" });
  UserFollow.belongsTo(User, { foreignKey: "followerUserId", as: "follower" });
  UserFollow.belongsTo(User, { foreignKey: "followingUserId", as: "followingUser" });

  Trip.hasMany(UserReview, { foreignKey: "tripId", as: "reviews" });
  UserReview.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  UserReview.belongsTo(User, { foreignKey: "reviewerUserId", as: "reviewer" });
  UserReview.belongsTo(User, { foreignKey: "revieweeUserId", as: "reviewee" });

  Trip.hasMany(TripInvitation, { foreignKey: "tripId", as: "invitations" });
  TripInvitation.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  TripInvitation.belongsTo(User, { foreignKey: "invitedByUserId", as: "inviter" });
  TripInvitation.belongsTo(User, { foreignKey: "invitedUserId", as: "invitedUser" });

  User.hasMany(LocationShare, { foreignKey: "userId", as: "locationShares" });
  LocationShare.belongsTo(User, { foreignKey: "userId", as: "user" });
  LocationShare.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  LocationShare.hasOne(LocationLatest, {
    foreignKey: "locationShareId",
    as: "latest",
  });
  LocationLatest.belongsTo(LocationShare, {
    foreignKey: "locationShareId",
    as: "share",
  });

  User.hasMany(UserBlock, { foreignKey: "blockerUserId", as: "blocks" });
  UserBlock.belongsTo(User, { foreignKey: "blockerUserId", as: "blocker" });
  UserBlock.belongsTo(User, { foreignKey: "blockedUserId", as: "blocked" });

  User.hasMany(Report, { foreignKey: "reporterUserId", as: "reports" });
  Report.belongsTo(User, { foreignKey: "reporterUserId", as: "reporter" });
  Report.hasMany(ModerationAction, { foreignKey: "reportId", as: "actions" });
  ModerationAction.belongsTo(Report, { foreignKey: "reportId", as: "report" });
  ModerationAction.belongsTo(User, { foreignKey: "adminUserId", as: "admin" });

  Trip.hasMany(GenerationJob, { foreignKey: "tripId", as: "generationJobs" });
  GenerationJob.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  GenerationJob.belongsTo(User, {
    foreignKey: "requestedByUserId",
    as: "requestedBy",
  });
  GenerationJob.belongsTo(ItineraryVersion, {
    foreignKey: "resultVersionId",
    as: "resultVersion",
  });

  Trip.hasMany(TripShareLink, { foreignKey: "tripId", as: "shareLinks" });
  TripShareLink.belongsTo(Trip, { foreignKey: "tripId", as: "trip" });
  TripShareLink.belongsTo(User, {
    foreignKey: "createdByUserId",
    as: "createdBy",
  });

  ApiUsageCounter.belongsTo(User, { foreignKey: "userId", as: "user" });
  IdempotencyKey.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });
}

export function initModels(sequelize: Sequelize = getSequelize()) {
  if (initialized) {
    return getModels();
  }

  initUserModel(sequelize);
  initUserProfileModel(sequelize);
  initAuthSessionModels(sequelize);
  initPlaceModel(sequelize);
  initProvinceModels(sequelize);
  initTemplateModels(sequelize);
  initTripModels(sequelize);
  initItineraryModels(sequelize);
  initCommunicationModels(sequelize);
  initSocialModels(sequelize);
  initSupportModels(sequelize);
  applyAssociations();
  initialized = true;

  return getModels();
}

export function resetInitModelsForTests() {
  initialized = false;
}

export function getModels() {
  return {
    User,
    UserProfile,
    AuthSession,
    PasswordResetToken,
    EmailVerificationToken,
    Place,
    Province,
    ProvincePlace,
    ItineraryTemplate,
    TemplateDay,
    TemplateStop,
    TemplateUsage,
    Trip,
    TripMember,
    TripJoinRequest,
    ItineraryVersion,
    ItineraryDay,
    ItineraryStop,
    BudgetItem,
    TripChecklistItem,
    TripComment,
    ChatRoom,
    Message,
    MessageReadState,
    Notification,
    PushSubscription,
    UserFollow,
    UserReview,
    LocationShare,
    LocationLatest,
    UserBlock,
    Report,
    ModerationAction,
    GenerationJob,
    TripShareLink,
    TripInvitation,
    ApiUsageCounter,
    IdempotencyKey,
  };
}

export {
  User,
  UserProfile,
  AuthSession,
  PasswordResetToken,
  EmailVerificationToken,
  Place,
  Province,
  ProvincePlace,
  ItineraryTemplate,
  TemplateDay,
  TemplateStop,
  TemplateUsage,
  Trip,
  TripMember,
  TripJoinRequest,
  ItineraryVersion,
  ItineraryDay,
  ItineraryStop,
  BudgetItem,
  TripChecklistItem,
  TripComment,
  ChatRoom,
  Message,
  MessageReadState,
  Notification,
  PushSubscription,
  UserFollow,
  UserReview,
  LocationShare,
  LocationLatest,
  UserBlock,
  Report,
  ModerationAction,
  GenerationJob,
  TripShareLink,
  TripInvitation,
  ApiUsageCounter,
  IdempotencyKey,
};
