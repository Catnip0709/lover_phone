import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { SharedModule } from "../shared/shared.module.js";
import { WechatProfileController } from "./wechat-profile.controller.js";
import { WechatProfileService } from "./wechat-profile.service.js";
import { WechatWalletController } from "./wechat-wallet.controller.js";
import { WechatWalletService } from "./wechat-wallet.service.js";

@Module({
  imports: [AuthModule, SharedModule],
  controllers: [WechatProfileController, WechatWalletController],
  providers: [WechatProfileService, WechatWalletService],
  exports: [WechatProfileService, WechatWalletService],
})
export class WechatModule {}
