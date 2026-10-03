<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ink">{{ t('boothsPage.title') }}</h2>
        <p class="text-sm text-ink-muted">{{ t('boothsPage.subtitle') }}</p>
      </div>
      <div v-if="isManager" class="flex items-center gap-2">
        <div class="flex overflow-hidden rounded-lg border border-border-warm" role="group">
          <button
            v-for="v in views"
            :key="v"
            type="button"
            class="px-3 py-2 text-sm"
            :class="view === v ? 'bg-primary-600 text-white' : 'text-ink-muted hover:bg-surface'"
            :data-testid="`booth-view-${v}`"
            @click="switchView(v)"
          >
            {{ t(v === 'calendar' ? 'boothsPage.viewCalendar' : 'boothsPage.viewList') }}
          </button>
        </div>
        <button type="button" class="btn-primary" data-testid="booth-new-btn" @click="openCreate()">
          + {{ t('boothsPage.newBooth') }}
        </button>
      </div>
    </div>

    <div v-if="!isManager" class="rounded-xl bg-paper p-8 text-center shadow-sm">
      <p class="text-ink-muted">{{ t('boothsPage.managerOnly') }}</p>
    </div>

    <div
      v-else
      :class="view === 'list' ? 'grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]' : 'space-y-6'"
    >
      <section :class="selectedId ? 'hidden min-w-0 lg:block' : 'min-w-0'">
        <UiCraftCard v-if="view === 'calendar'" variant="paper" padding="md">
          <LazyBoothCalendar
            :booths="booths"
            :week-start="weekStart"
            @update:week-start="setWeekStart"
            @select-booth="go($event)"
            @create-range="openCreate($event)"
          />
        </UiCraftCard>

        <div v-else class="space-y-4">
          <p v-if="booths.length === 0" class="rounded-xl bg-paper p-6 text-center text-sm text-ink-muted shadow-sm">
            {{ t('boothsPage.empty') }}
          </p>
          <template v-for="group in groups" :key="group.status">
            <details v-if="group.items.length" :open="group.status !== 'closed'" class="rounded-xl bg-paper p-3 shadow-sm">
              <summary class="cursor-pointer text-sm font-semibold text-ink">
                {{ t(`boothsPage.group.${group.status}`) }} ({{ group.items.length }})
              </summary>
              <ul class="mt-3 space-y-2">
                <li
                  v-for="b in group.items"
                  :key="b.id"
                  class="cursor-pointer rounded-lg border p-3 transition-colors"
                  :class="selectedId === b.id ? 'border-primary-500 bg-primary-50' : 'border-border-warm hover:bg-surface'"
                  :data-testid="`booth-card-${b.id}`"
                  @click="go(b.id)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-medium text-ink">{{ b.name }}</p>
                    <span class="badge shrink-0">{{ t(`boothsPage.status.${group.status}`) }}</span>
                  </div>
                  <p v-if="b.location" class="text-xs text-ink-muted">{{ b.location }}</p>
                  <p class="text-xs text-ink-muted">
                    {{ formatDateKey(b.start_date) || '—' }} – {{ formatDateKey(b.end_date) || '—' }}
                    <template v-if="boothDayCount(b.start_date, b.end_date)">
                      · {{ t('boothsPage.days', { n: boothDayCount(b.start_date, b.end_date) }) }}
                    </template>
                  </p>
                  <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs">
                      <span class="text-ink-muted">{{ t('boothsPage.fee') }}</span> {{ formatCurrency(b.booth_fee) }}
                    </span>
                    <span class="flex gap-3 text-xs">
                      <button
                        v-if="group.status !== 'closed'"
                        type="button"
                        class="font-medium text-primary-700 hover:underline"
                        :data-testid="`booth-use-pos-${b.id}`"
                        @click.stop="useAtPos(b)"
                      >
                        {{ t('boothsPage.useAtPos') }}
                      </button>
                      <button type="button" class="text-danger-600 hover:underline" @click.stop="remove(b)">
                        {{ t('common.delete') }}
                      </button>
                    </span>
                  </div>
                </li>
              </ul>
            </details>
          </template>
        </div>
      </section>

      <div v-if="selectedId" ref="detailWrap" class="min-w-0 space-y-3">
        <button type="button" class="text-sm text-primary-600 hover:underline" @click="go(null)">
          ← {{ t('boothsPage.back') }}
        </button>
        <BoothDetail ref="detail" :key="selectedId" :booth-id="selectedId" class="min-w-0" />
      </div>
      <div
        v-else-if="view === 'list'"
        class="hidden items-center justify-center rounded-xl border-2 border-dashed border-border-warm p-12 text-center text-sm text-ink-muted lg:flex"
      >
        {{ t('boothsPage.emptyDetail') }}
      </div>
    </div>

    <BoothCreateModal
      :show="showCreate"
      :initial-range="createRange"
      :week-start="weekStart"
      @close="showCreate = false"
      @created="onCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { boothStatus, type BoothStatus, type DateRange } from "~/lib/booths/calendar";
import type { BoothView } from "~/composables/useCalendarPrefs";
import { boothDayCount } from "~/lib/booths/cost";
import { getBangkokDateKey } from "~/lib/timezone";
import type { Booth } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { activeStoreId, isManager } = useStore();
const { formatCurrency, formatDateKey } = useFormat();
const { confirm } = useDialog();
const { booths, fetchBooths, deleteBooth } = useBooths();
const { view, weekStart, setView, setWeekStart } = useCalendarPrefs();
const { select: selectActiveBooth } = useActiveBooth();

const views = ["calendar", "list"] as const;
const selectedId = ref<string | null>(null);
const detail = ref<{ dirty: boolean } | null>(null);
const detailWrap = ref<HTMLElement | null>(null);
const showCreate = ref(false);
const createRange = ref<DateRange | undefined>();

onMounted(fetchBooths);
watch(activeStoreId, fetchBooths);

const groups = computed(() => {
  const today = getBangkokDateKey();
  const order: BoothStatus[] = ["ongoing", "upcoming", "ended", "closed"];
  return order.map((status) => ({
    status,
    items: booths.value.filter((b) => boothStatus(b, today) === status),
  }));
});

// switching view also leaves the detail (on phones the detail replaces the list/calendar)
async function switchView(v: BoothView) {
  if (!(await go(null))) return;
  setView(v);
}

// change the open booth, asking first when the current one has unsaved edits
async function go(id: string | null): Promise<boolean> {
  if (id !== selectedId.value && detail.value?.dirty && !(await confirm(t("boothsPage.unsavedConfirm")))) {
    return false;
  }
  selectedId.value = id;
  // in calendar view the detail sits below the calendar — bring it into view
  if (id) nextTick(() => detailWrap.value?.scrollIntoView({ behavior: "smooth", block: "start" }));
  return true;
}

function openCreate(range?: DateRange) {
  createRange.value = range;
  showCreate.value = true;
}

async function onCreated(id: string) {
  showCreate.value = false;
  await go(id);
}

function useAtPos(booth: Booth) {
  selectActiveBooth(booth.id);
  navigateTo("/pos");
}

async function remove(booth: Booth) {
  if (!(await confirm(t("boothsPage.confirmDelete", { name: booth.name })))) return;
  if (selectedId.value === booth.id) selectedId.value = null;
  await deleteBooth(booth.id);
}
</script>
