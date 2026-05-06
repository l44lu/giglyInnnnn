import { RefreshInputDto } from '../../../dto/auth/refresh-input.dto';
import { RefreshResponseDto } from '../../../dto/auth/refresh-response.dto';

export interface IRefreshUseCase {
  execute(data: RefreshInputDto): Promise<RefreshResponseDto>;
}

export const IRefreshUseCase = Symbol('IRefreshUseCase');
