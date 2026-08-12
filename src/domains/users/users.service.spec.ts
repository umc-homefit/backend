import { BadRequestException } from '@nestjs/common';

import {
  HousingOwnershipStatus,
  MaritalStatus,
  UpdateConditionProfileRequestDto,
} from './dto/users.dto';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

/**
 * MARRIAGE_EXPECTED(결혼예정)는 marriageDate가 "오늘부터 3개월 이내(오늘 포함)"여야 한다.
 * 경계가 애매해지기 쉬운 규칙이라 오늘/정확히 3개월/3개월 초과/과거를 고정해둔다.
 * 이 판정은 요청 바디만으로는 우회가 가능해 DTO가 아니라 Service에서 하며, 위반 시 USER400이다.
 */
describe('UsersService - MARRIAGE_EXPECTED 혼인일 검증', () => {
  const NOW = new Date('2026-08-02T00:00:00Z');

  let service: UsersService;
  let repository: {
    findConditionProfileByUserId: jest.Mock;
    upsertConditionProfile: jest.Mock;
  };

  /** maritalStatus/marriageDate만 담은 최소 요청으로 수정을 시도한다. */
  const updateWithMarriageDate = (marriageDate: string) =>
    service.updateConditionProfile(1n, {
      maritalStatus: MaritalStatus.MARRIAGE_EXPECTED,
      marriageDate,
    } as UpdateConditionProfileRequestDto);

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    repository = {
      findConditionProfileByUserId: jest.fn().mockResolvedValue(null),
      upsertConditionProfile: jest.fn().mockResolvedValue({
        userConditionProfileId: 1n,
        updatedAt: new Date('2026-08-02T00:00:00Z'),
      }),
    };
    service = new UsersService(repository as unknown as UsersRepository);
  });

  describe('허용 범위 (오늘 = 2026-08-02)', () => {
    it('오늘 날짜를 허용한다 (경계 포함)', async () => {
      await expect(updateWithMarriageDate('2026-08-02')).resolves.toBeDefined();
      expect(repository.upsertConditionProfile).toHaveBeenCalled();
    });

    it('정확히 3개월 뒤를 허용한다 (경계 포함)', async () => {
      await expect(updateWithMarriageDate('2026-11-02')).resolves.toBeDefined();
      expect(repository.upsertConditionProfile).toHaveBeenCalled();
    });

    it('범위 안의 중간 날짜를 허용한다', async () => {
      await expect(updateWithMarriageDate('2026-09-15')).resolves.toBeDefined();
    });
  });

  describe('거부 범위', () => {
    it('3개월 하루 초과면 거부한다', async () => {
      await expect(updateWithMarriageDate('2026-11-03')).rejects.toThrow(BadRequestException);
      expect(repository.upsertConditionProfile).not.toHaveBeenCalled();
    });

    it('과거 날짜면 거부한다', async () => {
      await expect(updateWithMarriageDate('2026-08-01')).rejects.toThrow(BadRequestException);
      expect(repository.upsertConditionProfile).not.toHaveBeenCalled();
    });

    it('거부 시 USER400 코드로 응답한다', async () => {
      // 형식 오류(COMMON400)와 구분되는 도메인 규칙 위반이므로 USER400이어야 한다.
      await expect(updateWithMarriageDate('2026-11-03')).rejects.toMatchObject({
        response: { code: 'USER400' },
      });
    });
  });

  describe('cross-field 우회 차단', () => {
    it('maritalStatus를 생략해도 DB 기존값이 MARRIAGE_EXPECTED면 검증한다', async () => {
      repository.findConditionProfileByUserId.mockResolvedValue({
        maritalStatus: MaritalStatus.MARRIAGE_EXPECTED,
        marriageDate: new Date('2026-09-01T00:00:00Z'),
      });

      // maritalStatus 없이 marriageDate만 범위 밖으로 바꾸려는 요청
      await expect(
        service.updateConditionProfile(1n, {
          marriageDate: '2027-01-01',
        } as UpdateConditionProfileRequestDto),
      ).rejects.toThrow(BadRequestException);
      expect(repository.upsertConditionProfile).not.toHaveBeenCalled();
    });
  });
});

/**
 * isHomeless는 housingOwnershipStatus와 독립적으로 검증돼 서로 모순된 값(예: OWNED인데
 * isHomeless=true)이 그대로 저장될 수 있었고, 실제 매칭·입주가능성 판정 로직은 isHomeless만
 * 참조해 화면 표시(housingOwnershipStatus 기준)와 판정 결과가 어긋나는 문제가 있었다.
 * 팀 합의(2026-08-06): HOMELESS일 때만 true, 나머지(FAMILY_OWNED/OWNED/UNKNOWN)는 false —
 * 클라이언트가 보낸 isHomeless 값과 무관하게 서버가 재계산해서 저장해야 한다.
 */
describe('UsersService - isHomeless 파생', () => {
  let service: UsersService;
  let repository: {
    findConditionProfileByUserId: jest.Mock;
    upsertConditionProfile: jest.Mock;
  };

  /** maritalStatus는 SINGLE로 고정해 혼인일 검증 분기를 안 타게 하고, housingOwnershipStatus/isHomeless만 바꿔본다. */
  const updateWithHousingStatus = (
    housingOwnershipStatus: HousingOwnershipStatus,
    isHomelessInRequest: boolean,
  ) =>
    service.updateConditionProfile(1n, {
      maritalStatus: MaritalStatus.SINGLE,
      housingOwnershipStatus,
      isHomeless: isHomelessInRequest,
    } as UpdateConditionProfileRequestDto);

  beforeEach(() => {
    repository = {
      findConditionProfileByUserId: jest.fn().mockResolvedValue(null),
      upsertConditionProfile: jest.fn().mockResolvedValue({
        userConditionProfileId: 1n,
        updatedAt: new Date('2026-08-02T00:00:00Z'),
      }),
    };
    service = new UsersService(repository as unknown as UsersRepository);
  });

  it('housingOwnershipStatus=HOMELESS면 isHomeless=false를 보내도 true로 저장한다', async () => {
    await updateWithHousingStatus(HousingOwnershipStatus.HOMELESS, false);

    expect(repository.upsertConditionProfile).toHaveBeenCalledWith(
      1n,
      expect.objectContaining({ isHomeless: true }),
    );
  });

  it.each([
    HousingOwnershipStatus.OWNED,
    HousingOwnershipStatus.FAMILY_OWNED,
    HousingOwnershipStatus.UNKNOWN,
  ])('housingOwnershipStatus=%s면 isHomeless=true를 보내도 false로 저장한다', async (status) => {
    await updateWithHousingStatus(status, true);

    expect(repository.upsertConditionProfile).toHaveBeenCalledWith(
      1n,
      expect.objectContaining({ isHomeless: false }),
    );
  });
});
