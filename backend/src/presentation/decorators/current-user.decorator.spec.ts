import { ExecutionContext } from '@nestjs/common';
import {
  CurrentUser,
  currentUserFactory,
  CurrentUserData,
} from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  const createMockContext = (requestUser?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: requestUser,
        }),
      }),
    }) as unknown as ExecutionContext;

  describe('1. Both properties present with different values', () => {
    const userWithBoth: CurrentUserData & { sub: string } = {
      id: 'id-alpha-111',
      sub: 'sub-beta-222',
      email: 'user@example.com',
      role: 'WORKER',
    };

    it('prioritizes user.id when "id" is requested', () => {
      const context = createMockContext(userWithBoth);
      const result = currentUserFactory('id', context);
      expect(result).toBe('id-alpha-111');
    });

    it('prioritizes user.sub when "sub" is requested', () => {
      const context = createMockContext(userWithBoth);
      const result = currentUserFactory('sub', context);
      expect(result).toBe('sub-beta-222');
    });
  });

  describe('2. Only sub present', () => {
    const userOnlySub = {
      sub: 'sub-only-999',
      email: 'subonly@example.com',
      role: 'WORKER' as const,
    };

    it('returns sub when "sub" is requested', () => {
      const context = createMockContext(userOnlySub);
      const result = currentUserFactory('sub', context);
      expect(result).toBe('sub-only-999');
    });

    it('falls back to sub when "id" is requested', () => {
      const context = createMockContext(userOnlySub);
      const result = currentUserFactory('id', context);
      expect(result).toBe('sub-only-999');
    });
  });

  describe('3. Only id present', () => {
    const userOnlyId = {
      id: 'id-only-888',
      email: 'idonly@example.com',
      role: 'WORKER' as const,
    };

    it('returns id when "id" is requested', () => {
      const context = createMockContext(userOnlyId);
      const result = currentUserFactory('id', context);
      expect(result).toBe('id-only-888');
    });

    it('falls back to id when "sub" is requested', () => {
      const context = createMockContext(userOnlyId);
      const result = currentUserFactory('sub', context);
      expect(result).toBe('id-only-888');
    });
  });

  describe('4. Missing user on request', () => {
    it('returns undefined when user is undefined', () => {
      const context = createMockContext(undefined);
      expect(currentUserFactory('id', context)).toBeUndefined();
      expect(currentUserFactory('sub', context)).toBeUndefined();
      expect(currentUserFactory(undefined, context)).toBeUndefined();
      expect(currentUserFactory('email', context)).toBeUndefined();
    });

    it('returns undefined when user is null', () => {
      const context = createMockContext(null);
      expect(currentUserFactory('id', context)).toBeUndefined();
      expect(currentUserFactory('sub', context)).toBeUndefined();
      expect(currentUserFactory(undefined, context)).toBeUndefined();
    });

    it('returns undefined when getRequest returns empty object', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as unknown as ExecutionContext;
      expect(currentUserFactory('id', context)).toBeUndefined();
      expect(currentUserFactory('sub', context)).toBeUndefined();
      expect(currentUserFactory(undefined, context)).toBeUndefined();
    });
  });

  describe('5. Existing decorator behavior without a requested property & other properties', () => {
    const standardUser: CurrentUserData = {
      id: 'standard-user-123',
      email: 'standard@example.com',
      role: 'RECRUITER',
    };

    it('returns entire user object when no property argument is passed', () => {
      const context = createMockContext(standardUser);
      const result = currentUserFactory(undefined, context);
      expect(result).toEqual(standardUser);
    });

    it('returns email when "email" property is requested', () => {
      const context = createMockContext(standardUser);
      const result = currentUserFactory('email', context);
      expect(result).toBe('standard@example.com');
    });

    it('returns role when "role" property is requested', () => {
      const context = createMockContext(standardUser);
      const result = currentUserFactory('role', context);
      expect(result).toBe('RECRUITER');
    });
  });

  describe('6. Parameter decorator integration', () => {
    it('attaches metadata properly to a controller method parameter', () => {
      class SampleController {
        testMethod(
          @CurrentUser('id') id: string,
          @CurrentUser('sub') sub: string,
          @CurrentUser() user: any,
        ) {
          return { id, sub, user };
        }
      }

      const metadata = Reflect.getMetadata(
        '__routeArguments__',
        SampleController,
        'testMethod',
      );
      expect(metadata).toBeDefined();

      const keys = Object.keys(metadata);
      expect(keys.length).toBe(3);

      const mockCtx = createMockContext({
        id: 'param-id',
        sub: 'param-sub',
      });

      const idArg = Object.values(metadata).find(
        (arg: any) => arg.data === 'id',
      ) as any;
      expect(idArg.factory('id', mockCtx)).toBe('param-id');

      const subArg = Object.values(metadata).find(
        (arg: any) => arg.data === 'sub',
      ) as any;
      expect(subArg.factory('sub', mockCtx)).toBe('param-sub');

      const noArg = Object.values(metadata).find(
        (arg: any) => arg.data === undefined,
      ) as any;
      expect(noArg.factory(undefined, mockCtx)).toEqual({
        id: 'param-id',
        sub: 'param-sub',
      });
    });
  });
});
