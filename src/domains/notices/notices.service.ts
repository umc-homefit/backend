import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PageInfoDto } from '../../common/dto/page-info.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetNoticesQueryDto,
  GetSavedNoticesQueryDto,
  NoticeConditionDto,
  NoticeConditionTargetType,
  NoticeDetailResultDto,
  NoticeFileDto,
  NoticeFileType,
  NoticeListItemDto,
  NoticeListResultDto,
  NoticeSort,
  NoticeStatus,
  NoticeUnitDto,
  SaveNoticeResultDto,
  SavedNoticeItemDto,
  SavedNoticeListResultDto,
  SavedNoticeSort,
  UnsaveNoticeResultDto,
} from './dto/notices.dto';

type NoticeListRecord = Prisma.NoticeGetPayload<{
  include: {
    complex: true;
    units: true;
    savedNotices: {
      select: { savedNoticeId: true };
    };
    _count: {
      select: { savedNotices: true };
    };
  };
}>;

type NoticeDetailRecord = Prisma.NoticeGetPayload<{
  include: {
    complex: true;
    units: true;
    conditions: true;
    files: true;
    savedNotices: {
      select: { savedNoticeId: true };
    };
    _count: {
      select: { savedNotices: true };
    };
  };
}>;

type SavedNoticeRecord = Prisma.SavedNoticeGetPayload<{
  include: {
    notice: {
      include: {
        complex: true;
        _count: {
          select: { savedNotices: true };
        };
      };
    };
  };
}>;

type SaveNoticeServiceResult = {
  result: SaveNoticeResultDto;
  created: boolean;
};

@Injectable()
export class NoticesService {
  private readonly maxPageSize = 50;
  private readonly kstOffsetMs = 9 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async getNotices(userId: bigint, query: GetNoticesQueryDto): Promise<NoticeListResultDto> {
    const page = query.page ?? 0;
    const size = Math.min(query.size ?? 10, this.maxPageSize);
    const where = this.buildNoticeWhere(query);

    const [totalElements, notices] = await this.prisma.$transaction([
      this.prisma.notice.count({ where }),
      this.prisma.notice.findMany({
        where,
        include: {
          complex: true,
          units: {
            orderBy: { unitId: 'asc' },
          },
          savedNotices: {
            where: { userId },
            select: { savedNoticeId: true },
            take: 1,
          },
          _count: {
            select: { savedNotices: true },
          },
        },
        orderBy: this.buildNoticeOrderBy(query.sort),
        skip: page * size,
        take: size,
      }),
    ]);

    const totalPages = Math.ceil(totalElements / size);
    const pageInfo: PageInfoDto = {
      page,
      size,
      totalElements,
      totalPages,
      hasNext: page + 1 < totalPages,
    };

    return {
      notices: notices.map((notice) => this.toNoticeListItem(notice)),
      pageInfo,
    };
  }

  async getSavedNotices(
    userId: bigint,
    query: GetSavedNoticesQueryDto,
  ): Promise<SavedNoticeListResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 10;

    const [totalElements, savedNotices] = await this.prisma.$transaction([
      this.prisma.savedNotice.count({ where: { userId } }),
      this.prisma.savedNotice.findMany({
        where: { userId },
        include: {
          notice: {
            include: {
              complex: true,
              _count: {
                select: { savedNotices: true },
              },
            },
          },
        },
        orderBy: this.buildSavedNoticeOrderBy(query.sort),
        skip: page * size,
        take: size,
      }),
    ]);
    const totalPages = Math.ceil(totalElements / size);

    return {
      savedNotices: savedNotices.map((savedNotice) => this.toSavedNoticeItem(savedNotice)),
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
    };
  }

  async getNoticeDetail(userId: bigint, noticeId: number): Promise<NoticeDetailResultDto> {
    const notice = await this.prisma.notice.findUnique({
      where: { noticeId: BigInt(noticeId) },
      include: {
        complex: true,
        units: {
          orderBy: { unitId: 'asc' },
        },
        conditions: {
          orderBy: { conditionId: 'asc' },
        },
        files: {
          orderBy: { fileId: 'asc' },
        },
        savedNotices: {
          where: { userId },
          select: { savedNoticeId: true },
          take: 1,
        },
        _count: {
          select: { savedNotices: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('존재하지 않는 공고입니다.');
    }

    return this.toNoticeDetail(notice);
  }

  async saveNotice(userId: bigint, noticeId: number): Promise<SaveNoticeServiceResult> {
    const noticeIdBigInt = BigInt(noticeId);
    await this.ensureNoticeExists(noticeIdBigInt);

    const existing = await this.prisma.savedNotice.findUnique({
      where: { userId_noticeId: { userId, noticeId: noticeIdBigInt } },
    });

    const savedNotice = await this.prisma.savedNotice.upsert({
      where: { userId_noticeId: { userId, noticeId: noticeIdBigInt } },
      update: {},
      create: { userId, noticeId: noticeIdBigInt },
    });
    const interestedCount = await this.syncInterestedCount(noticeIdBigInt);

    return {
      created: existing === null,
      result: {
        savedNoticeId: this.toNumber(savedNotice.savedNoticeId),
        noticeId,
        isSaved: true,
        interestedCount,
        savedAt: this.toIsoString(savedNotice.createdAt)!,
      },
    };
  }

  async unsaveNotice(userId: bigint, noticeId: number): Promise<UnsaveNoticeResultDto> {
    const noticeIdBigInt = BigInt(noticeId);
    await this.ensureNoticeExists(noticeIdBigInt);

    await this.prisma.savedNotice.deleteMany({
      where: { userId, noticeId: noticeIdBigInt },
    });

    return {
      noticeId,
      isSaved: false,
      interestedCount: await this.syncInterestedCount(noticeIdBigInt),
    };
  }

  private async ensureNoticeExists(noticeId: bigint): Promise<void> {
    const notice = await this.prisma.notice.findUnique({
      where: { noticeId },
      select: { noticeId: true },
    });

    if (!notice) {
      throw new NotFoundException('존재하지 않는 공고입니다.');
    }
  }

  private countSavedNotices(noticeId: bigint): Promise<number> {
    return this.prisma.savedNotice.count({ where: { noticeId } });
  }

  private async syncInterestedCount(noticeId: bigint): Promise<number> {
    const interestedCount = await this.countSavedNotices(noticeId);

    await this.prisma.notice.update({
      where: { noticeId },
      data: { interestedCount },
    });

    return interestedCount;
  }

  private buildNoticeWhere(query: GetNoticesQueryDto): Prisma.NoticeWhereInput {
    const where: Prisma.NoticeWhereInput = {};
    const keyword = query.keyword?.trim();

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { announcementNo: { contains: keyword, mode: 'insensitive' } },
        { complex: { is: { name: { contains: keyword, mode: 'insensitive' } } } },
      ];
    }

    const complexWhere: Prisma.HousingComplexWhereInput = {};
    const region = query.region?.trim();
    const district = query.district?.trim();

    if (region) {
      complexWhere.region = region;
    }

    if (district) {
      complexWhere.district = district;
    }

    if (Object.keys(complexWhere).length > 0) {
      where.complex = { is: complexWhere };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isAdditionalRecruitment !== undefined) {
      where.isAdditionalRecruitment = query.isAdditionalRecruitment;
    }

    const unitWhere: Prisma.NoticeUnitWhereInput = {};

    if (query.minDeposit !== undefined) {
      unitWhere.depositMin = { gte: query.minDeposit };
    }

    if (query.maxDeposit !== undefined) {
      unitWhere.depositMax = { lte: query.maxDeposit };
    }

    const areaWhere: Prisma.DecimalNullableFilter = {};

    if (query.minArea !== undefined) {
      areaWhere.gte = query.minArea;
    }

    if (query.maxArea !== undefined) {
      areaWhere.lte = query.maxArea;
    }

    if (Object.keys(areaWhere).length > 0) {
      unitWhere.exclusiveAreaM2 = areaWhere;
    }

    if (Object.keys(unitWhere).length > 0) {
      where.units = { some: unitWhere };
    }

    return where;
  }

  private buildNoticeOrderBy(
    sort: NoticeSort | undefined,
  ): Prisma.NoticeOrderByWithRelationInput[] {
    switch (sort) {
      case NoticeSort.DEADLINE:
        return [{ applicationEndAt: 'asc' }, { noticeId: 'desc' }];
      case NoticeSort.POPULAR:
        return [{ savedNotices: { _count: 'desc' } }, { views: 'desc' }, { noticeId: 'desc' }];
      case NoticeSort.LATEST:
      default:
        return [{ createdAt: 'desc' }, { noticeId: 'desc' }];
    }
  }

  private buildSavedNoticeOrderBy(
    sort: SavedNoticeSort | undefined,
  ): Prisma.SavedNoticeOrderByWithRelationInput[] {
    switch (sort) {
      case SavedNoticeSort.POPULAR:
        return [
          { notice: { savedNotices: { _count: 'desc' } } },
          { createdAt: 'desc' },
          { savedNoticeId: 'desc' },
        ];
      case SavedNoticeSort.LATEST:
      default:
        return [{ createdAt: 'desc' }, { savedNoticeId: 'desc' }];
    }
  }

  private toSavedNoticeItem(savedNotice: SavedNoticeRecord): SavedNoticeItemDto {
    const status = this.toNoticeStatus(savedNotice.notice.status);

    return {
      savedNoticeId: this.toNumber(savedNotice.savedNoticeId),
      noticeId: this.toNumber(savedNotice.noticeId),
      title: savedNotice.notice.title,
      region: savedNotice.notice.complex.region,
      district: savedNotice.notice.complex.district,
      status,
      statusDisplayText: this.toStatusDisplayText(status),
      isAdditionalRecruitment: savedNotice.notice.isAdditionalRecruitment,
      applicationEndAt: this.toIsoString(savedNotice.notice.applicationEndAt),
      dDayText: this.toDdayText(savedNotice.notice.applicationEndAt),
      interestedCount: savedNotice.notice._count.savedNotices,
      savedAt: this.toIsoString(savedNotice.createdAt)!,
    };
  }

  private toNoticeListItem(notice: NoticeListRecord): NoticeListItemDto {
    const unitStats = this.getUnitStats(notice.units);
    const status = this.toNoticeStatus(notice.status);

    return {
      noticeId: this.toNumber(notice.noticeId),
      title: notice.title,
      region: notice.complex.region,
      district: notice.complex.district,
      unitSummary: this.toUnitSummary(notice.units),
      depositMin: unitStats.depositMin,
      depositMax: unitStats.depositMax,
      monthlyRentMin: unitStats.monthlyRentMin,
      monthlyRentMax: unitStats.monthlyRentMax,
      status,
      statusDisplayText: this.toStatusDisplayText(status),
      isAdditionalRecruitment: notice.isAdditionalRecruitment,
      applicationStartAt: this.toIsoString(notice.applicationStartAt),
      applicationEndAt: this.toIsoString(notice.applicationEndAt),
      dDayText: this.toDdayText(notice.applicationEndAt),
      views: notice.views,
      interestedCount: notice._count.savedNotices,
      isSaved: notice.savedNotices.length > 0,
    };
  }

  private toNoticeDetail(notice: NoticeDetailRecord): NoticeDetailResultDto {
    const status = this.toNoticeStatus(notice.status);

    return {
      noticeId: this.toNumber(notice.noticeId),
      title: notice.title,
      announcementNo: notice.announcementNo,
      region: notice.complex.region,
      district: notice.complex.district,
      address: notice.complex.address,
      sourceUrl: notice.sourceUrl,
      status,
      statusDisplayText: this.toStatusDisplayText(status),
      isAdditionalRecruitment: notice.isAdditionalRecruitment,
      applicationStartAt: this.toIsoString(notice.applicationStartAt),
      applicationEndAt: this.toIsoString(notice.applicationEndAt),
      views: notice.views,
      interestedCount: notice._count.savedNotices,
      isSaved: notice.savedNotices.length > 0,
      units: notice.units.map((unit) => this.toNoticeUnit(unit)),
      conditions: notice.conditions.map((condition) => this.toNoticeCondition(condition)),
      files: notice.files.map((file) => this.toNoticeFile(file)),
    };
  }

  private toNoticeUnit(unit: NoticeDetailRecord['units'][number]): NoticeUnitDto {
    return {
      unitId: this.toNumber(unit.unitId),
      unitName: unit.unitName ?? '',
      exclusiveAreaM2: this.toNullableNumber(unit.exclusiveAreaM2),
      supplyAreaM2: this.toNullableNumber(unit.supplyAreaM2),
      depositMin: this.toNullableNumber(unit.depositMin),
      depositMax: this.toNullableNumber(unit.depositMax),
      monthlyRentMin: this.toNullableNumber(unit.monthlyRentMin),
      monthlyRentMax: this.toNullableNumber(unit.monthlyRentMax),
      supplyCount: unit.supplyCount,
    };
  }

  private toNoticeCondition(
    condition: NoticeDetailRecord['conditions'][number],
  ): NoticeConditionDto {
    return {
      conditionId: this.toNumber(condition.conditionId),
      targetType: this.toConditionTargetType(condition.targetType),
      minAge: condition.minAge,
      maxAge: condition.maxAge,
      incomeLimitAmount: this.toNullableNumber(condition.incomeLimitAmount),
      incomeLimitText: condition.incomeLimitText,
      assetLimitAmount: this.toNullableNumber(condition.assetLimitAmount),
      assetLimitText: condition.assetLimitText,
      requiresHomeless: condition.requiresHomeless,
      residenceRequirement: condition.residenceRequirement,
      rawConditionText: condition.rawConditionText,
    };
  }

  private toNoticeFile(file: NoticeDetailRecord['files'][number]): NoticeFileDto {
    return {
      fileId: this.toNumber(file.fileId),
      fileName: file.fileName,
      fileType: this.toFileType(file.fileType),
      fileUrl: file.fileUrl,
      registeredAt: this.toIsoString(file.registeredAt),
    };
  }

  private getUnitStats(units: NoticeListRecord['units']) {
    return {
      depositMin: this.minOrNull(units.map((unit) => this.toNullableNumber(unit.depositMin))),
      depositMax: this.maxOrNull(units.map((unit) => this.toNullableNumber(unit.depositMax))),
      monthlyRentMin: this.minOrNull(
        units.map((unit) => this.toNullableNumber(unit.monthlyRentMin)),
      ),
      monthlyRentMax: this.maxOrNull(
        units.map((unit) => this.toNullableNumber(unit.monthlyRentMax)),
      ),
    };
  }

  private toUnitSummary(units: NoticeListRecord['units']): string | null {
    const areas = units
      .map((unit) => this.toNullableNumber(unit.exclusiveAreaM2))
      .filter((area): area is number => area !== null)
      .sort((a, b) => a - b);

    if (areas.length === 0) {
      return null;
    }

    return `전용 ${this.formatArea(areas[0])}㎡`;
  }

  private toNoticeStatus(status: string): NoticeStatus {
    if (Object.values(NoticeStatus).includes(status as NoticeStatus)) {
      return status as NoticeStatus;
    }

    return NoticeStatus.RECRUITING;
  }

  private toConditionTargetType(targetType: string | null): NoticeConditionTargetType {
    if (
      targetType &&
      Object.values(NoticeConditionTargetType).includes(targetType as NoticeConditionTargetType)
    ) {
      return targetType as NoticeConditionTargetType;
    }

    return NoticeConditionTargetType.OTHER;
  }

  private toFileType(fileType: string): NoticeFileType {
    if (Object.values(NoticeFileType).includes(fileType as NoticeFileType)) {
      return fileType as NoticeFileType;
    }

    return NoticeFileType.OTHER;
  }

  private toStatusDisplayText(status: NoticeStatus): string {
    const statusDisplayText: Record<NoticeStatus, string> = {
      [NoticeStatus.RECRUITING]: '모집중',
      [NoticeStatus.SCHEDULED]: '모집예정',
      [NoticeStatus.CLOSING_SOON]: '마감임박',
      [NoticeStatus.CLOSED]: '마감',
    };

    return statusDisplayText[status];
  }

  private toDdayText(applicationEndAt: Date | null): string | null {
    if (!applicationEndAt) {
      return null;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays =
      (this.toKoreanWallDateStart(applicationEndAt).getTime() -
        this.toCurrentKstDateStart().getTime()) /
      dayMs;

    if (diffDays < 0) {
      return '마감';
    }

    if (diffDays === 0) {
      return 'D-Day';
    }

    return `D-${diffDays}`;
  }

  private toKoreanWallDateStart(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private toIsoString(date: Date | null): string | null {
    if (!date) {
      return null;
    }

    return `${date.getUTCFullYear()}-${this.pad(date.getUTCMonth() + 1)}-${this.pad(
      date.getUTCDate(),
    )}T${this.pad(date.getUTCHours())}:${this.pad(date.getUTCMinutes())}:${this.pad(
      date.getUTCSeconds(),
    )}+09:00`;
  }

  private toCurrentKstDateStart(): Date {
    const shifted = new Date(Date.now() + this.kstOffsetMs);

    return new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
    );
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private toNumber(value: number | bigint): number {
    return Number(value);
  }

  private toNullableNumber(value: number | bigint | Prisma.Decimal | null): number | null {
    return value === null ? null : Number(value);
  }

  private minOrNull(values: Array<number | null>): number | null {
    const numbers = values.filter((value): value is number => value !== null);

    return numbers.length > 0 ? Math.min(...numbers) : null;
  }

  private maxOrNull(values: Array<number | null>): number | null {
    const numbers = values.filter((value): value is number => value !== null);

    return numbers.length > 0 ? Math.max(...numbers) : null;
  }

  private formatArea(area: number): string {
    return Number.isInteger(area) ? area.toString() : area.toFixed(2).replace(/\.?0+$/, '');
  }
}
