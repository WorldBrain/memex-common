// import ActivityFollowsStorage from "../../activity-follows/storage";

// export default ActivityFollowsStorage;

import StorageManager from "@worldbrain/storex";
import {
  StorageModule,
  StorageModuleConfig,
  StorageModuleConstructorArgs,
} from "@worldbrain/storex-pattern-modules";
import { UserReference } from "../../web-interface/types/users";
import { STORAGE_VERSIONS } from "../../web-interface/storage/versions";
import {
  ActivityFollow,
  ActivityFollowReference,
} from "./types";

interface ActivityFollowFromDB extends ActivityFollow {
  id: string
  user: string
}

interface ActivityFollowWithRef extends ActivityFollow {
  reference: ActivityFollowReference;
  userReference: UserReference;
}

interface EntityArgs {
  objectId: string;
  collection: string;
}

interface FollowEntityArgs extends EntityArgs {
  userReference: UserReference;
}

export default class ActivityFollowsStorage extends StorageModule {
  private storageManager: StorageManager;

  constructor(options: StorageModuleConstructorArgs) {
    super(options);

    this.storageManager = options.storageManager;
  }

  getConfig = (): StorageModuleConfig => ({
    collections: {
      activityFollow: {
        version: STORAGE_VERSIONS[5].date,
        fields: {
          objectId: { type: "string" },
          collection: { type: "string" },
          createdWhen: { type: "timestamp" },
        },
        indices: [
          { field: { relationship: "user" } },
          { field: "collection" },
          { field: "objectId" },
        ],
        relationships: [{ childOf: "user" }],
      },
    },
    operations: {
      createFollow: {
        operation: "createObject",
        collection: "activityFollow",
      },
      deleteFollow: {
        operation: "deleteObject",
        collection: "activityFollow",
        args: {
          id: "$id:pk",
        },
      },
      findFollow: {
        operation: "findObject",
        collection: "activityFollow",
        args: {
          collection: "$collection:string",
          objectId: "$objectId:string",
          user: "$user:string",
        },
      },
      findFollowsByCollection: {
        operation: "findObjects",
        collection: "activityFollow",
        args: {
          collection: "$collection:string",
          user: "$user:string",
        },
      },
      findFollowsByEntity: {
        operation: "findObjects",
        collection: "activityFollow",
        args: {
          collection: "$collection:string",
          objectId: "$objectId:string",
        },
      },
    },
    accessRules: {
      ownership: {
        activityFollow: {
          field: 'user',
          access: ['create', 'delete'],
        },
      },
      permissions: {
        activityFollow: { read: { rule: true } },
      }
    }
  });

  private static prepareFollow = ({
    id,
    user: userId,
    ...follow
  }: ActivityFollowFromDB): ActivityFollowWithRef => ({
    ...follow,
    reference: { id, type: "activity-follow-reference" },
    userReference: { id: userId, type: "user-reference" },
  });

  private async findFollowedEntity({
    collection,
    objectId,
    userReference,
  }: FollowEntityArgs): Promise<ActivityFollowWithRef | null> {
    const foundFollow: ActivityFollowFromDB | null = await this.operation("findFollow", {
      collection,
      objectId,
      user: userReference.id,
    });

    if (!foundFollow) {
      return null;
    }

    return ActivityFollowsStorage.prepareFollow(foundFollow);
  }

  async storeFollow({
    objectId,
    collection,
    userReference,
    createdWhen = new Date(),
  }: FollowEntityArgs & { createdWhen?: Date }): Promise<
    ActivityFollowWithRef
  > {
    const foundFollow = await this.findFollowedEntity({
      objectId,
      collection,
      userReference,
    });

    if (foundFollow) {
      return foundFollow;
    }

    const { object } = await this.operation("createFollow", {
      objectId,
      collection,
      user: userReference.id,
      createdWhen: createdWhen.getTime(),
    });

    return ActivityFollowsStorage.prepareFollow(object);
  }

  async deleteFollow({
    objectId,
    collection,
    userReference,
  }: FollowEntityArgs): Promise<void> {
    const foundFollow = await this.findFollowedEntity({
      objectId,
      collection,
      userReference,
    });

    if (foundFollow) {
      await this.operation("deleteFollow", { id: foundFollow.reference.id });
    }
  }

  async isEntityFollowedByUser({
    objectId,
    collection,
    userReference,
  }: FollowEntityArgs): Promise<boolean> {
    const foundFollow = await this.findFollowedEntity({
      objectId,
      collection,
      userReference,
    });

    return !!foundFollow;
  }

  async getAllEntityFollowers(args: EntityArgs): Promise<UserReference[]> {
    const follows = await this.getAllFollowsByEntity(args);

    return follows.map((follow) => follow.userReference);
  }

  async getAllFollowsByCollection({
    collection,
    userReference,
  }: {
    userReference: UserReference;
    collection: string;
  }): Promise<ActivityFollowWithRef[]> {
    const follows: ActivityFollowFromDB[] = await this.operation(
      "findFollowsByCollection",
      { collection, user: userReference.id }
    );

    return follows.map(ActivityFollowsStorage.prepareFollow);
  }

  async getAllFollowsByEntity({
    collection,
    objectId,
  }: EntityArgs): Promise<ActivityFollowWithRef[]> {
    const follows: ActivityFollowFromDB[] = await this.operation(
      "findFollowsByEntity",
      { collection, objectId }
    );

    return follows.map(ActivityFollowsStorage.prepareFollow);
  }
}
