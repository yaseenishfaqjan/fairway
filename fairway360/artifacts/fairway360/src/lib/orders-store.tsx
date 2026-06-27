import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  useGetMyOrders,
  useListOrders,
  useCreateOrder,
  useAdvanceOrderStatus,
  getGetMyOrdersQueryKey,
  getListOrdersQueryKey,
  type Order,
  type OrderInput,
  type OrderStatus,
} from "@workspace/api-client-react";

export type NewOrderInput = OrderInput;

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
  New: "Preparing", Preparing: "Ready", Ready: "Delivered", Delivered: "Delivered",
};

interface OrdersContextValue {
  orders: Order[];
  placeOrder: (input: OrderInput) => void;
  advanceOrder: (id: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role;
  const isMember = role === "member";
  const isStaff = role === "supervisor" || role === "employee";

  // Members see only their own orders; staff (F&B board) see the whole club.
  const myOrdersQ = useGetMyOrders({
    query: { enabled: isMember, queryKey: getGetMyOrdersQueryKey() },
  });
  const listOrdersQ = useListOrders(undefined, {
    query: { enabled: isStaff, queryKey: getListOrdersQueryKey() },
  });

  const activeQueryKey = isMember ? getGetMyOrdersQueryKey() : getListOrdersQueryKey();
  const orders: Order[] = (isMember ? myOrdersQ.data : listOrdersQ.data) ?? [];

  const createOrder = useCreateOrder();
  const advanceStatus = useAdvanceOrderStatus();

  // Live order feed: the F&B board and members both reflect status changes as
  // they happen. The SSE payload only carries the event type + id, so any event
  // for this club simply triggers a refetch of the active list.
  useEffect(() => {
    if (!user) return;
    const source = new EventSource("/api/realtime/orders");
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: activeQueryKey });
    source.addEventListener("order.created", refetch);
    source.addEventListener("order.updated", refetch);
    return () => source.close();
    // activeQueryKey is derived from role, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  function placeOrder(input: OrderInput) {
    createOrder.mutate(
      { data: input },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: activeQueryKey }) },
    );
  }

  function advanceOrder(id: string) {
    const current = orders.find((o) => o.id === id);
    if (!current) return;
    advanceStatus.mutate(
      { id, data: { status: NEXT_STATUS[current.status] } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: activeQueryKey }) },
    );
  }

  return (
    <OrdersContext.Provider value={{ orders, placeOrder, advanceOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within an OrdersProvider");
  return ctx;
}
