import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module.js";
import { UsersService } from "../users/users.service.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { JwtService } from "./jwt.service.js";
import { PasswordService } from "./password.service.js";

@Module({
  imports: [SharedModule],
  providers: [AuthService, JwtAuthGuard, JwtService, PasswordService, UsersService],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
