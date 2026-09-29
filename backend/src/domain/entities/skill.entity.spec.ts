import { SkillEntity } from './skill.entity';
import { WorkerSkillEntity } from './worker-skill.entity';

describe('Skills Domain Entities', () => {
  describe('SkillEntity', () => {
    it('should instantiate and assign properties via partial constructor', () => {
      const now = new Date();
      const entity = new SkillEntity({
        id: 'skill-uuid-1',
        name: 'Dishwashing',
        createdAt: now,
      });

      expect(entity.id).toBe('skill-uuid-1');
      expect(entity.name).toBe('Dishwashing');
      expect(entity.createdAt).toBe(now);
    });

    it('should allow empty instantiation', () => {
      const entity = new SkillEntity();
      expect(entity.id).toBeUndefined();
      expect(entity.name).toBeUndefined();
    });
  });

  describe('WorkerSkillEntity', () => {
    it('should instantiate and default skillType to CORE when undefined', () => {
      const entity = new WorkerSkillEntity({
        id: 'worker-skill-uuid-1',
        workerId: 'worker-profile-uuid-1',
        skillId: 'skill-uuid-1',
      });

      expect(entity.id).toBe('worker-skill-uuid-1');
      expect(entity.workerId).toBe('worker-profile-uuid-1');
      expect(entity.skillId).toBe('skill-uuid-1');
      expect(entity.skillType).toBe('CORE');
    });

    it('should preserve explicit skillType when provided', () => {
      const entity = new WorkerSkillEntity({
        id: 'worker-skill-uuid-2',
        workerId: 'worker-profile-uuid-1',
        skillId: 'skill-uuid-2',
        skillType: 'CUSTOM',
      });

      expect(entity.skillType).toBe('CUSTOM');
    });
  });
});
