"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Ban,
  Check,
  Hash,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationBar } from "@/components/admin/PaginationBar";
import {
  cancelBookingsAction,
  decideBookingsAction,
  deleteBookingsAction,
  fetchBookingIdsAction,
  fetchBookingsPageAction,
} from "@/lib/actions/bookings";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  Booking,
  BookingListStatus,
  BookingStatus,
  Room,
} from "@/lib/types";

const PAGE_SIZES = [10, 20, 50, 100] as const;

const STATUS_FILTERS: Array<{
  value: BookingListStatus;
  label: string;
}> = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "معلق" },
  { value: "approved", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
  { value: "cancelled", label: "ملغي" },
];

interface RecentBookingsPanelProps {
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  status: BookingListStatus;
  roomId: string;
  rooms: Pick<Room, "id" | "name" | "color">[];
}

type QueryState = {
  q: string;
  status: BookingListStatus;
  roomId: string;
  page: number;
  pageSize: number;
};

function syncUrl(state: QueryState) {
  if (typeof window === "undefined") return;
  const next = new URLSearchParams(window.location.search);

  if (state.q.trim()) next.set("q", state.q.trim());
  else next.delete("q");

  if (state.status !== "all") next.set("status", state.status);
  else next.delete("status");

  if (state.roomId) next.set("room", state.roomId);
  else next.delete("room");

  if (state.pageSize !== 20) next.set("per", String(state.pageSize));
  else next.delete("per");

  if (state.page > 1) next.set("page", String(state.page));
  else next.delete("page");

  const qs = next.toString();
  const url = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState(window.history.state, "", url);
}

export function RecentBookingsPanel({
  items: initialItems,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  q: initialQ,
  status: initialStatus,
  roomId: initialRoomId,
  rooms,
}: RecentBookingsPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState<QueryState>({
    q: initialQ,
    status: initialStatus,
    roomId: initialRoomId,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const queryRef = useRef(query);
  const [search, setSearch] = useState(initialQ);
  const deferredSearch = useDeferredValue(search);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusById, setStatusById] = useState<Record<string, BookingStatus>>(
    () => Object.fromEntries(initialItems.map((b) => [b.id, b.status]))
  );
  const [confirmAction, setConfirmAction] = useState<
    null | "delete" | "approved" | "rejected" | "cancel"
  >(null);
  const requestId = useRef(0);
  const skipSearchFetch = useRef(true);

  const pageIds = useMemo(() => items.map((b) => b.id), [items]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected =
    pageIds.some((id) => selected.has(id)) && !allPageSelected;
  const selectedCount = selected.size;
  const allResultsSelected =
    total > 0 && selectedCount >= total && selectedCount > 0;

  const pendingSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selected) {
      if (statusById[id] === "pending") count += 1;
    }
    return count;
  }, [selected, statusById]);

  const cancellableSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selected) {
      const status = statusById[id];
      if (status === "pending" || status === "approved") count += 1;
    }
    return count;
  }, [selected, statusById]);

  const knownSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selected) {
      if (statusById[id]) count += 1;
    }
    return count;
  }, [selected, statusById]);

  function mergeStatuses(next: Record<string, BookingStatus>) {
    setStatusById((prev) => ({ ...prev, ...next }));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  useEffect(() => {
    mergeStatuses(
      Object.fromEntries(items.map((b) => [b.id, b.status]))
    );
  }, [items]);

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllPage(checked: boolean) {
    if (checked) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of pageIds) next.add(id);
        return next;
      });
      return;
    }

    // Unchecking while “all results” (or any off-page) is selected clears everything.
    const pageIdSet = new Set(pageIds);
    const hasOffPage = Array.from(selected).some((id) => !pageIdSet.has(id));
    if (hasOffPage || allResultsSelected) {
      clearSelection();
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) next.delete(id);
      return next;
    });
  }

  function selectAllResults() {
    const current = queryRef.current;
    startTransition(async () => {
      const res = await fetchBookingIdsAction({
        q: current.q,
        status: current.status,
        roomId: current.roomId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSelected(new Set(res.ids));
      mergeStatuses(res.statuses);
      if (res.capped) {
        toast.message(
          `اتحدد أول ${res.ids.length} من ${res.total} نتيجة — الحد الأقصى للتحديد الجماعي`
        );
      } else {
        toast.success(
          res.ids.length === 1
            ? "اتحدد طلب واحد"
            : `اتحدد كل النتائج (${res.ids.length})`
        );
      }
    });
  }

  function applyQuery(patch: Partial<QueryState>) {
    const next: QueryState = { ...queryRef.current, ...patch };
    queryRef.current = next;
    setQuery(next);
    syncUrl(next);
    clearSelection();

    const id = ++requestId.current;
    startTransition(async () => {
      let res = await fetchBookingsPageAction({
        q: next.q,
        status: next.status,
        roomId: next.roomId,
        page: next.page,
        pageSize: next.pageSize,
      });
      if (id !== requestId.current || !res.ok) return;

      if (res.items.length === 0 && res.total > 0 && next.page > 1) {
        const clamped = { ...next, page: 1 };
        queryRef.current = clamped;
        setQuery(clamped);
        syncUrl(clamped);
        res = await fetchBookingsPageAction({
          q: clamped.q,
          status: clamped.status,
          roomId: clamped.roomId,
          page: 1,
          pageSize: clamped.pageSize,
        });
        if (id !== requestId.current || !res.ok) return;
      }

      setItems(res.items);
      setTotal(res.total);
    });
  }

  function reloadCurrentPage() {
    const current = queryRef.current;
    const id = ++requestId.current;
    startTransition(async () => {
      let res = await fetchBookingsPageAction({
        q: current.q,
        status: current.status,
        roomId: current.roomId,
        page: current.page,
        pageSize: current.pageSize,
      });
      if (id !== requestId.current || !res.ok) return;

      if (res.items.length === 0 && res.total > 0 && current.page > 1) {
        const clamped = { ...current, page: 1 };
        queryRef.current = clamped;
        setQuery(clamped);
        syncUrl(clamped);
        res = await fetchBookingsPageAction({
          q: clamped.q,
          status: clamped.status,
          roomId: clamped.roomId,
          page: 1,
          pageSize: clamped.pageSize,
        });
        if (id !== requestId.current || !res.ok) return;
      }

      setItems(res.items);
      setTotal(res.total);
    });
  }

  function runConfirmedAction() {
    const ids = Array.from(selected);
    if (!confirmAction || ids.length === 0) return;

    if (confirmAction === "cancel") {
      startTransition(async () => {
        const res = await cancelBookingsAction(ids);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(
          res.cancelled === 1
            ? "تم إلغاء حجز واحد والمكان بقى فاضي"
            : `تم إلغاء ${res.cancelled} حجوزات`
        );
        setConfirmAction(null);
        clearSelection();
        reloadCurrentPage();
      });
      return;
    }

    if (confirmAction === "delete") {
      startTransition(async () => {
        const res = await deleteBookingsAction(ids);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(
          res.deleted === 1
            ? "تم حذف طلب واحد"
            : `تم حذف ${res.deleted} طلبات`
        );
        setConfirmAction(null);
        clearSelection();
        reloadCurrentPage();
      });
      return;
    }

    const decision = confirmAction;
    startTransition(async () => {
      const res = await decideBookingsAction(ids, decision);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      const parts = [
        decision === "approved"
          ? res.decided === 1
            ? "اتقبل طلب واحد"
            : `اتقبل ${res.decided} طلبات`
          : res.decided === 1
            ? "اترفض طلب واحد"
            : `اترفض ${res.decided} طلبات`,
      ];
      if (res.skipped > 0) {
        parts.push(`واتجاوز ${res.skipped} مش معلق`);
      }
      if (res.conflicts > 0) {
        parts.push(`و${res.conflicts} فيهم تعارض`);
      }
      toast.success(parts.join(" — "));
      setConfirmAction(null);
      clearSelection();
      reloadCurrentPage();
    });
  }

  useEffect(() => {
    if (skipSearchFetch.current) {
      skipSearchFetch.current = false;
      return;
    }
    if (deferredSearch === query.q) return;
    const id = window.setTimeout(() => {
      applyQuery({ q: deferredSearch, page: 1 });
    }, 280);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch]);

  const hasFilters =
    Boolean(query.q.trim()) ||
    query.status !== "all" ||
    Boolean(query.roomId) ||
    query.pageSize !== 20;

  const emptyHint = useMemo(() => {
    if (!hasFilters) return "لا توجد طلبات بعد";
    if (query.q.trim()) {
      return `مفيش نتائج لـ «${query.q.trim()}» — جرّب كلمة تانية أو امسح الفلاتر`;
    }
    return "مفيش نتائج بالفلاتر دي — جرّب تغيير الحالة أو المكان";
  }, [hasFilters, query.q]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">آخر الطلبات</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            بحث سريع، فلترة، وتقسيم صفحات —{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {total}
            </span>{" "}
            طلب
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="space-y-3 border-b border-border bg-gradient-to-l from-sand-2/80 via-card to-card px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-11" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالخدمة، الاسم، التليفون، أو كود التتبع…"
                className="h-11 pr-10 text-sm sm:text-base"
                aria-label="بحث في الطلبات"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    applyQuery({ q: "", page: 1 });
                  }}
                  className="absolute left-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-sand-11 transition hover:bg-sand-3 hover:text-foreground"
                  aria-label="مسح البحث"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Select
                value={query.roomId || "all"}
                onValueChange={(v) =>
                  applyQuery({ roomId: v === "all" ? "" : v, page: 1 })
                }
              >
                <SelectTrigger className="h-11 w-full sm:w-[11.5rem]">
                  <SelectValue placeholder="المكان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأماكن</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(query.pageSize)}
                onValueChange={(v) =>
                  applyQuery({ pageSize: Number(v), page: 1 })
                }
              >
                <SelectTrigger className="h-11 w-[7.25rem]" aria-label="لكل صفحة">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / صفحة
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin"
            role="tablist"
            aria-label="فلتر الحالة"
          >
            {STATUS_FILTERS.map((f) => {
              const active = query.status === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => applyQuery({ status: f.value, page: 1 })}
                  className={cn(
                    "shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-sand-11 ring-1 ring-border hover:bg-sand-2 hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  applyQuery({
                    q: "",
                    status: "all",
                    roomId: "",
                    page: 1,
                    pageSize: 20,
                  });
                }}
                className="ms-1 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-tomato-9 transition hover:bg-tomato-3"
              >
                مسح الكل
              </button>
            ) : null}
            <button
              type="button"
              onClick={reloadCurrentPage}
              disabled={pending}
              aria-label="تحديث البيانات"
              title="تحديث"
              className="ms-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-card px-3 text-sm font-semibold text-sand-11 ring-1 ring-border transition hover:bg-sand-2 hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-4 w-4", pending && "animate-spin")}
                aria-hidden
              />
              تحديث
            </button>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="flex items-center gap-3 border-b border-border bg-sand-2/40 px-4 py-2.5 sm:px-5">
            <Checkbox
              checked={
                allPageSelected
                  ? true
                  : somePageSelected
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(v) => toggleAllPage(v === true)}
              aria-label="تحديد كل الطلبات في الصفحة"
            />
            <span className="text-sm font-medium text-sand-11">
              {allPageSelected
                ? `محدد ${pageIds.length} في الصفحة`
                : "تحديد الكل في الصفحة"}
            </span>
          </div>
        ) : null}

        <CardContent
          className={cn(
            "relative divide-y divide-border p-0 transition-opacity duration-150",
            pending && "opacity-60"
          )}
          aria-busy={pending}
        >
          {items.map((b) => {
            const isChecked = selected.has(b.id);
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3.5 text-sm transition-colors sm:px-5",
                  isChecked ? "bg-primary/5" : "hover:bg-sand-2/70"
                )}
              >
                <Checkbox
                  className="mt-1"
                  checked={isChecked}
                  onCheckedChange={(v) => toggleOne(b.id, v === true)}
                  aria-label={`تحديد طلب ${b.service_name}`}
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold tracking-tight text-foreground">
                        {b.service_name}
                      </p>
                      {b.rooms?.name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-sand-3 px-2 py-0.5 text-xs font-semibold text-sand-11">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: b.rooms.color ?? "#12A594",
                            }}
                            aria-hidden
                          />
                          {b.rooms.name}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateAr(b.booking_date)}
                      <span className="mx-1.5 text-sand-8">·</span>
                      <span className="font-semibold text-foreground/80">
                        {rangeLabel(b.start_hour, b.end_hour)}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand-11">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        {b.requester_name}
                      </span>
                      <a
                        href={`tel:${b.requester_phone.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-primary hover:underline"
                        dir="ltr"
                        aria-label={`اتصال بـ ${b.requester_phone}`}
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {b.requester_phone}
                      </a>
                      <span
                        className="inline-flex items-center gap-1.5 font-mono"
                        dir="ltr"
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {b.tracking_code}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={b.status} />
                    {b.status === "pending" || b.status === "approved" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setSelected(new Set([b.id]));
                          setConfirmAction("cancel");
                        }}
                        className="text-xs font-semibold text-tomato-9 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        إلغاء الحجز
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-base font-semibold text-foreground">
                لا توجد نتائج
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{emptyHint}</p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    applyQuery({
                      q: "",
                      status: "all",
                      roomId: "",
                      page: 1,
                      pageSize: 20,
                    });
                  }}
                  className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                >
                  إعادة ضبط الفلاتر
                </button>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        {total > 0 ? (
          <PaginationBar
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(nextPage) => applyQuery({ page: nextPage })}
          />
        ) : null}
      </Card>

      {selectedCount > 0 ? (
        <div className="sticky bottom-3 z-20 mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md animate-bar-in sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              محدد{" "}
              <span className="tabular-nums text-primary">{selectedCount}</span>{" "}
              طلب
              {knownSelectedCount > 0 ? (
                <>
                  <span className="mx-1.5 text-sand-8">·</span>
                  <span className="font-semibold text-amber-11 tabular-nums">
                    {pendingSelectedCount}
                  </span>{" "}
                  <span className="font-medium text-muted-foreground">معلق</span>
                </>
              ) : null}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {!allResultsSelected ? (
                <button
                  type="button"
                  disabled={pending || total === 0}
                  onClick={selectAllResults}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                >
                  تحديد الكل ({total})
                </button>
              ) : (
                <span className="text-xs font-semibold text-primary">
                  كل النتائج محددة
                </span>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs font-semibold text-sand-11 underline-offset-2 hover:text-foreground hover:underline"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              size="sm"
              disabled={pending || pendingSelectedCount === 0}
              title={
                pendingSelectedCount === 0
                  ? "مفيش طلبات معلقة ضمن التحديد"
                  : `قبول ${pendingSelectedCount} طلب معلق`
              }
              onClick={() => setConfirmAction("approved")}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" aria-hidden />
              قبول
              {pendingSelectedCount > 0 ? (
                <span className="tabular-nums opacity-90">
                  ({pendingSelectedCount})
                </span>
              ) : null}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending || pendingSelectedCount === 0}
              title={
                pendingSelectedCount === 0
                  ? "مفيش طلبات معلقة ضمن التحديد"
                  : `رفض ${pendingSelectedCount} طلب معلق`
              }
              onClick={() => setConfirmAction("rejected")}
              className="gap-1.5"
            >
              <X className="h-4 w-4" aria-hidden />
              رفض
              {pendingSelectedCount > 0 ? (
                <span className="tabular-nums opacity-90">
                  ({pendingSelectedCount})
                </span>
              ) : null}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending || cancellableSelectedCount === 0}
              title={
                cancellableSelectedCount === 0
                  ? "مفيش حجوزات معلقة أو مقبولة ضمن التحديد"
                  : `إلغاء ${cancellableSelectedCount} حجز`
              }
              onClick={() => setConfirmAction("cancel")}
              className="gap-1.5"
            >
              <Ban className="h-4 w-4" aria-hidden />
              إلغاء
              {cancellableSelectedCount > 0 ? (
                <span className="tabular-nums opacity-90">
                  ({cancellableSelectedCount})
                </span>
              ) : null}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmAction("delete")}
              className="gap-1.5 border-tomato-9/40 text-tomato-9 hover:bg-tomato-3"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              حذف
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "cancel"
                ? "تأكيد إلغاء الحجز"
                : confirmAction === "delete"
                ? "تأكيد الحذف"
                : confirmAction === "approved"
                  ? "تأكيد القبول"
                  : "تأكيد الرفض"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "cancel" ? (
                <>
                  هيتلغى{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {cancellableSelectedCount}
                  </span>{" "}
                  حجز (معلق أو مقبول) والمكان هيفضى. المرفوض والملغي بيتجاهلوا.
                </>
              ) : confirmAction === "delete" ? (
                <>
                  هيتشال{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {selectedCount}
                  </span>{" "}
                  طلب نهائيًا ومش هيرجعوا. متأكد؟
                </>
              ) : (
                <>
                  هيتم{" "}
                  {confirmAction === "approved" ? "قبول" : "رفض"}{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {pendingSelectedCount}
                  </span>{" "}
                  طلب معلق فقط.
                  {selectedCount > pendingSelectedCount ? (
                    <>
                      {" "}
                      و{" "}
                      <span className="font-bold text-foreground tabular-nums">
                        {selectedCount - pendingSelectedCount}
                      </span>{" "}
                      مش معلقين هيتجاهلوا.
                    </>
                  ) : null}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmAction(null)}
            >
              رجوع
            </Button>
            <Button
              variant={
                confirmAction === "approved" ? "success" : "destructive"
              }
              disabled={pending}
              onClick={runConfirmedAction}
              className="gap-2"
            >
              {confirmAction === "cancel" ? (
                <>
                  <Ban className="h-4 w-4" aria-hidden />
                  إلغاء الحجز
                </>
              ) : confirmAction === "delete" ? (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  احذف نهائيًا
                </>
              ) : confirmAction === "approved" ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  قبول المعلق
                </>
              ) : (
                <>
                  <X className="h-4 w-4" aria-hidden />
                  رفض المعلق
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function StatusBadge({ status }: { status: BookingStatus | string }) {
  if (status === "pending") return <Badge variant="pending">معلق</Badge>;
  if (status === "approved") return <Badge variant="success">مقبول</Badge>;
  if (status === "rejected") return <Badge variant="danger">مرفوض</Badge>;
  return <Badge variant="muted">ملغي</Badge>;
}
