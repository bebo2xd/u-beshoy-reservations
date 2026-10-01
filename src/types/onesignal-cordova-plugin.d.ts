declare module "onesignal-cordova-plugin" {
  type NotificationClickEvent = {
    notification: {
      additionalData?: Record<string, unknown> | null;
      launchURL?: string | null;
    };
  };

  type PushSubscriptionChangedState = {
    previous: { id?: string; token?: string; optedIn: boolean };
    current: { id?: string; token?: string; optedIn: boolean };
  };

  const OneSignal: {
    initialize(appId: string): void;
    login(externalId: string): void;
    logout(): void;
    User: {
      addTag(key: string, value: string): void;
      addTags(tags: Record<string, string>): void;
      removeTag(key: string): void;
      removeTags(keys: string[]): void;
      addSms(smsNumber: string): void;
      removeSms(smsNumber: string): void;
      addEmail(email: string): void;
      removeEmail(email: string): void;
      pushSubscription: {
        optIn(): void;
        optOut(): void;
        getIdAsync(): Promise<string | null>;
        getOptedInAsync(): Promise<boolean>;
        addEventListener(
          event: "change",
          listener: (event: PushSubscriptionChangedState) => void
        ): void;
        removeEventListener(
          event: "change",
          listener: (event: PushSubscriptionChangedState) => void
        ): void;
      };
    };
    Notifications: {
      requestPermission(fallbackToSettings: boolean): Promise<boolean>;
      addEventListener(
        event: "click",
        listener: (event: NotificationClickEvent) => void
      ): void;
      removeEventListener(
        event: "click",
        listener: (event: NotificationClickEvent) => void
      ): void;
    };
  };

  export default OneSignal;
}
