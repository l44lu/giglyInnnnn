import {
  InvalidJobApplicationTransitionError,
  JobApplicationEntity,
  JobApplicationStatus,
} from './job-application.entity';

describe('JobApplicationEntity', () => {
  const validPayload = {
    id: 'app-uuid-1',
    jobPostId: 'job-post-1',
    workerId: 'worker-profile-1',
    status: JobApplicationStatus.PENDING,
    expectedPay: 150.5,
    availableDate: new Date('2026-12-01T00:00:00.000Z'),
    appliedAt: new Date('2026-11-11T10:00:00.000Z'),
    updatedAt: new Date('2026-11-11T10:00:00.000Z'),
  };

  it('creates an entity with a valid complete payload', () => {
    const entity = new JobApplicationEntity(validPayload);
    expect(entity.id).toBe('app-uuid-1');
    expect(entity.jobPostId).toBe('job-post-1');
    expect(entity.workerId).toBe('worker-profile-1');
    expect(entity.status).toBe(JobApplicationStatus.PENDING);
    expect(entity.expectedPay).toBe(150.5);
    expect(entity.availableDate).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    expect(entity.appliedAt).toEqual(new Date('2026-11-11T10:00:00.000Z'));
    expect(entity.updatedAt).toEqual(new Date('2026-11-11T10:00:00.000Z'));
  });

  it('defaults optional fields properly when omitted', () => {
    const minimalPayload = {
      id: 'app-uuid-2',
      jobPostId: 'job-post-2',
      workerId: 'worker-profile-2',
      appliedAt: new Date('2026-11-11T10:00:00.000Z'),
      updatedAt: new Date('2026-11-11T10:00:00.000Z'),
    };

    const entity = new JobApplicationEntity(minimalPayload);
    expect(entity.status).toBe(JobApplicationStatus.PENDING);
    expect(entity.expectedPay).toBeNull();
    expect(entity.availableDate).toBeNull();
  });

  describe('required field validation', () => {
    it('throws when jobPostId is missing', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            jobPostId: undefined as any,
          }),
      ).toThrow('jobPostId must be a non-empty string');
    });

    it('throws when jobPostId is an empty or whitespace string', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            jobPostId: '   ',
          }),
      ).toThrow('jobPostId must be a non-empty string');
    });

    it('throws when workerId is missing', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            workerId: undefined as any,
          }),
      ).toThrow('workerId must be a non-empty string');
    });

    it('throws when workerId is an empty or whitespace string', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            workerId: '   ',
          }),
      ).toThrow('workerId must be a non-empty string');
    });
  });

  describe('status validation', () => {
    it.each([
      JobApplicationStatus.PENDING,
      JobApplicationStatus.SHORTLISTED,
      JobApplicationStatus.ACCEPTED,
      JobApplicationStatus.REJECTED,
      JobApplicationStatus.WITHDRAWN,
    ])('accepts valid status %s', (status) => {
      const entity = new JobApplicationEntity({
        ...validPayload,
        status,
      });
      expect(entity.status).toBe(status);
    });

    it('throws when status is not a valid JobApplicationStatus', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            status: 'unknown_status' as any,
          }),
      ).toThrow(/status must be one of:/);
    });
  });

  describe('expectedPay validation', () => {
    it('accepts null expectedPay', () => {
      const entity = new JobApplicationEntity({
        ...validPayload,
        expectedPay: null,
      });
      expect(entity.expectedPay).toBeNull();
    });

    it('accepts valid 2-decimal expectedPay', () => {
      const entity = new JobApplicationEntity({
        ...validPayload,
        expectedPay: 99.99,
      });
      expect(entity.expectedPay).toBe(99.99);
    });

    it('throws when expectedPay is zero', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            expectedPay: 0,
          }),
      ).toThrow('expectedPay must be greater than 0');
    });

    it('throws when expectedPay is negative', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            expectedPay: -10,
          }),
      ).toThrow('expectedPay must be greater than 0');
    });

    it('throws when expectedPay exceeds 99999999.99', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            expectedPay: 100000000,
          }),
      ).toThrow('expectedPay cannot exceed 99999999.99');
    });

    it('throws when expectedPay has more than 2 decimal places', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            expectedPay: 50.123,
          }),
      ).toThrow('expectedPay cannot have more than 2 decimal places');
    });

    it('throws when expectedPay is not a number', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            expectedPay: NaN as any,
          }),
      ).toThrow('expectedPay must be a valid number');
    });
  });

  describe('availableDate validation', () => {
    it('accepts null availableDate', () => {
      const entity = new JobApplicationEntity({
        ...validPayload,
        availableDate: null,
      });
      expect(entity.availableDate).toBeNull();
    });

    it('accepts valid Date instance', () => {
      const date = new Date('2026-12-25T00:00:00.000Z');
      const entity = new JobApplicationEntity({
        ...validPayload,
        availableDate: date,
      });
      expect(entity.availableDate).toBe(date);
    });

    it('throws when availableDate is an invalid Date object', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            availableDate: new Date('invalid-date'),
          }),
      ).toThrow('availableDate must be a valid Date');
    });

    it('throws when availableDate is not a Date object', () => {
      expect(
        () =>
          new JobApplicationEntity({
            ...validPayload,
            availableDate: '2026-12-25' as any,
          }),
      ).toThrow('availableDate must be a valid Date');
    });
  });

  describe('Feature 4 status transition rules', () => {
    it.each([
      {
        from: JobApplicationStatus.PENDING,
        method: 'shortlist' as const,
        to: JobApplicationStatus.SHORTLISTED,
      },
      {
        from: JobApplicationStatus.PENDING,
        method: 'accept' as const,
        to: JobApplicationStatus.ACCEPTED,
      },
      {
        from: JobApplicationStatus.PENDING,
        method: 'reject' as const,
        to: JobApplicationStatus.REJECTED,
      },
      {
        from: JobApplicationStatus.PENDING,
        method: 'withdraw' as const,
        to: JobApplicationStatus.WITHDRAWN,
      },
      {
        from: JobApplicationStatus.SHORTLISTED,
        method: 'accept' as const,
        to: JobApplicationStatus.ACCEPTED,
      },
      {
        from: JobApplicationStatus.SHORTLISTED,
        method: 'reject' as const,
        to: JobApplicationStatus.REJECTED,
      },
      {
        from: JobApplicationStatus.SHORTLISTED,
        method: 'withdraw' as const,
        to: JobApplicationStatus.WITHDRAWN,
      },
    ])(
      'allows transition $from -> $to via $method()',
      ({ from, method, to }) => {
        const entity = new JobApplicationEntity({
          ...validPayload,
          status: from,
        });

        expect(entity.canTransitionTo(to)).toBe(true);
        entity[method]();
        expect(entity.status).toBe(to);
      },
    );

    it('supports chained valid transitions PENDING -> SHORTLISTED -> ACCEPTED/REJECTED/WITHDRAWN', () => {
      const acceptedFlow = new JobApplicationEntity({
        ...validPayload,
        status: JobApplicationStatus.PENDING,
      });
      acceptedFlow.shortlist();
      expect(acceptedFlow.status).toBe(JobApplicationStatus.SHORTLISTED);
      expect(acceptedFlow.isTerminal()).toBe(false);
      acceptedFlow.accept();
      expect(acceptedFlow.status).toBe(JobApplicationStatus.ACCEPTED);
      expect(acceptedFlow.isTerminal()).toBe(true);

      const rejectedFlow = new JobApplicationEntity({
        ...validPayload,
        status: JobApplicationStatus.PENDING,
      });
      rejectedFlow.shortlist();
      rejectedFlow.reject();
      expect(rejectedFlow.status).toBe(JobApplicationStatus.REJECTED);
      expect(rejectedFlow.isTerminal()).toBe(true);

      const withdrawnFlow = new JobApplicationEntity({
        ...validPayload,
        status: JobApplicationStatus.PENDING,
      });
      withdrawnFlow.shortlist();
      withdrawnFlow.withdraw();
      expect(withdrawnFlow.status).toBe(JobApplicationStatus.WITHDRAWN);
      expect(withdrawnFlow.isTerminal()).toBe(true);
    });

    const forbiddenTransitions: Array<{
      from: JobApplicationStatus;
      to: JobApplicationStatus;
      method?: 'shortlist' | 'accept' | 'reject' | 'withdraw';
    }> = [
      {
        from: JobApplicationStatus.PENDING,
        to: JobApplicationStatus.PENDING,
      },
      {
        from: JobApplicationStatus.SHORTLISTED,
        to: JobApplicationStatus.PENDING,
      },
      {
        from: JobApplicationStatus.SHORTLISTED,
        to: JobApplicationStatus.SHORTLISTED,
        method: 'shortlist',
      },
      {
        from: JobApplicationStatus.ACCEPTED,
        to: JobApplicationStatus.PENDING,
      },
      {
        from: JobApplicationStatus.ACCEPTED,
        to: JobApplicationStatus.SHORTLISTED,
        method: 'shortlist',
      },
      {
        from: JobApplicationStatus.ACCEPTED,
        to: JobApplicationStatus.ACCEPTED,
        method: 'accept',
      },
      {
        from: JobApplicationStatus.ACCEPTED,
        to: JobApplicationStatus.REJECTED,
        method: 'reject',
      },
      {
        from: JobApplicationStatus.ACCEPTED,
        to: JobApplicationStatus.WITHDRAWN,
        method: 'withdraw',
      },
      {
        from: JobApplicationStatus.REJECTED,
        to: JobApplicationStatus.PENDING,
      },
      {
        from: JobApplicationStatus.REJECTED,
        to: JobApplicationStatus.SHORTLISTED,
        method: 'shortlist',
      },
      {
        from: JobApplicationStatus.REJECTED,
        to: JobApplicationStatus.ACCEPTED,
        method: 'accept',
      },
      {
        from: JobApplicationStatus.REJECTED,
        to: JobApplicationStatus.REJECTED,
        method: 'reject',
      },
      {
        from: JobApplicationStatus.REJECTED,
        to: JobApplicationStatus.WITHDRAWN,
        method: 'withdraw',
      },
      {
        from: JobApplicationStatus.WITHDRAWN,
        to: JobApplicationStatus.PENDING,
      },
      {
        from: JobApplicationStatus.WITHDRAWN,
        to: JobApplicationStatus.SHORTLISTED,
        method: 'shortlist',
      },
      {
        from: JobApplicationStatus.WITHDRAWN,
        to: JobApplicationStatus.ACCEPTED,
        method: 'accept',
      },
      {
        from: JobApplicationStatus.WITHDRAWN,
        to: JobApplicationStatus.REJECTED,
        method: 'reject',
      },
      {
        from: JobApplicationStatus.WITHDRAWN,
        to: JobApplicationStatus.WITHDRAWN,
        method: 'withdraw',
      },
    ];

    it.each(forbiddenTransitions)(
      'forbids transition $from -> $to',
      ({ from, to, method }) => {
        const entity = new JobApplicationEntity({
          ...validPayload,
          status: from,
        });

        expect(entity.canTransitionTo(to)).toBe(false);

        if (method) {
          expect(() => entity[method]()).toThrow(
            InvalidJobApplicationTransitionError,
          );
          expect(() => entity[method]()).toThrow(
            `Cannot transition job application from "${from}" to "${to}"`,
          );
        }

        expect(entity.status).toBe(from);
      },
    );

    it('rejects arbitrary direct status assignment at runtime', () => {
      const entity = new JobApplicationEntity(validPayload);

      expect(() => {
        (entity as unknown as { status: JobApplicationStatus }).status =
          JobApplicationStatus.ACCEPTED;
      }).toThrow(TypeError);

      expect(entity.status).toBe(JobApplicationStatus.PENDING);
    });

    it('exposes exact allowed transitions per status', () => {
      expect(
        JobApplicationEntity.getAllowedTransitions(
          JobApplicationStatus.PENDING,
        ),
      ).toEqual([
        JobApplicationStatus.SHORTLISTED,
        JobApplicationStatus.ACCEPTED,
        JobApplicationStatus.REJECTED,
        JobApplicationStatus.WITHDRAWN,
      ]);
      expect(
        JobApplicationEntity.getAllowedTransitions(
          JobApplicationStatus.SHORTLISTED,
        ),
      ).toEqual([
        JobApplicationStatus.ACCEPTED,
        JobApplicationStatus.REJECTED,
        JobApplicationStatus.WITHDRAWN,
      ]);
      expect(
        JobApplicationEntity.getAllowedTransitions(
          JobApplicationStatus.ACCEPTED,
        ),
      ).toEqual([]);
      expect(
        JobApplicationEntity.getAllowedTransitions(
          JobApplicationStatus.REJECTED,
        ),
      ).toEqual([]);
      expect(
        JobApplicationEntity.getAllowedTransitions(
          JobApplicationStatus.WITHDRAWN,
        ),
      ).toEqual([]);
    });
  });
});
