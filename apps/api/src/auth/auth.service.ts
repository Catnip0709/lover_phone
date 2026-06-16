import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthResponse, AuthUser } from "@myphone/shared";
import { RedisService } from "../infra/redis.service.js";
import { UsersService } from "../users/users.service.js";
import { JwtService } from "./jwt.service.js";
import { PasswordService } from "./password.service.js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService)
    private readonly users: UsersService,
    @Inject(PasswordService)
    private readonly passwords: PasswordService,
    @Inject(JwtService)
    private readonly jwt: JwtService,
    @Inject(RedisService)
    private readonly redis: RedisService,
  ) {}

  async register(input: { username: string; password: string }): Promise<AuthResponse> {
    const passwordHash = await this.passwords.hashPassword(input.password);
    const user = await this.users.createUser({
      username: input.username,
      passwordHash,
    });

    return this.issueTokens(user);
  }

  async login(input: { username: string; password: string }): Promise<AuthResponse> {
    const userWithPassword = await this.users.findByUsername(input.username);

    if (!userWithPassword) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    const passwordMatched = await this.passwords.verifyPassword(
      input.password,
      userWithPassword.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    return this.issueTokens(this.users.toAuthUser(userWithPassword));
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = this.jwt.verify(refreshToken, "refresh");

    if (!payload.jti) {
      throw new UnauthorizedException("Refresh Token 缺少 jti");
    }

    const storedUserId = await this.redis.get(this.refreshKey(payload.jti));

    if (storedUserId !== payload.sub) {
      throw new UnauthorizedException("Refresh Token 已失效");
    }

    await this.redis.del(this.refreshKey(payload.jti));

    const user = await this.users.findAuthUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("用户不存在或已删除");
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const payload = this.jwt.verify(refreshToken, "refresh");

    if (!payload.jti) {
      throw new BadRequestException("Refresh Token 缺少 jti");
    }

    await this.redis.del(this.refreshKey(payload.jti));
    return { success: true };
  }

  async validateAccessToken(accessToken: string): Promise<AuthUser> {
    const payload = this.jwt.verify(accessToken, "access");
    const user = await this.users.findAuthUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException("用户不存在或已删除");
    }

    return user;
  }

  private async issueTokens(user: AuthUser): Promise<AuthResponse> {
    const accessToken = this.jwt.signAccessToken(user);
    const refreshToken = this.jwt.signRefreshToken(user);

    await this.redis.set(
      this.refreshKey(refreshToken.jti),
      user.id,
      this.jwt.refreshTtlSeconds,
    );

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user,
    };
  }

  private refreshKey(jti: string): string {
    return `auth:refresh:${jti}`;
  }
}
