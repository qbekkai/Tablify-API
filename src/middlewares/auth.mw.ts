import {
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NestMiddleware,
	UnauthorizedException,
} from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';
import { FirebaseService } from '@/services/firebase.service';
import { UserService } from '@/services/user.service';

@Injectable()
export class PreAuthMiddleware implements NestMiddleware {
	private auth: any;

	constructor(
		private readonly firebaseApp: FirebaseService,
		private readonly userService: UserService,
	) {
		this.auth = firebaseApp.auth;
	}

	async use(req: Request, res: Response, next: NextFunction): Promise<void> {
		const { authorization } = req.headers;
		if (!authorization) throw new ForbiddenException('Not logged in');

		try {
			const token = authorization.replace('Bearer ', '');
			const decodeIdToken = await this.auth.verifyIdToken(token);
			req.user = await this.userService.user(decodeIdToken.user_id);
			next();
		} catch (error) {
			if (error && error.errorInfo)
				switch (true) {
					case /auth\/id-token-expired/.test(error.errorInfo.code):
						throw new UnauthorizedException('Session expired');
					default:
						throw new UnauthorizedException('Session Invalid');
				}
			throw new InternalServerErrorException();
		}
	}

	// private static accessDenied(url: string, res: Response) {
	// 	res.status(403).json({
	// 		statusCode: 403,
	// 		timestamp: new Date().toISOString(),
	// 		path: url,
	// 		message: 'access denied',
	// 	});
	// }
}

declare global {
	namespace Express {
		interface Request {
			user: any;
		}
	}
}
