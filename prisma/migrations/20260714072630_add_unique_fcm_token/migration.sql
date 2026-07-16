/*
  Warnings:

  - A unique constraint covering the columns `[fcm_token]` on the table `user_device` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UK_USER_DEVICE_FCM_TOKEN" ON "user_device"("fcm_token");
