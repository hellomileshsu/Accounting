import type { RecurringRule } from '../types';
import { useRtdbList, type RtdbListApi } from './useRtdbList';

export function useRecurring(): RtdbListApi<RecurringRule> {
  return useRtdbList<RecurringRule>('recurring');
}
