// @vitest-environment node

import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PUT } from "@/app/api/clients/[id]/route";
import { POST } from "@/app/api/clients/route";
import { SUPABASE_ANON_KEY, SUPABASE_URL, createSession } from "../helpers/supabase-auth";
import { makeUser } from "../helpers/test-users";

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

type RouteSupabaseClient = SupabaseClient & {
  auth: SupabaseClient["auth"] & {
    getUser: () => Promise<{ data: { user: Session["user"] }; error: null }>;
  };
};

let currentSupabaseClient: RouteSupabaseClient;
let currentSession: Session;
let createdClientIds: string[] = [];

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => currentSupabaseClient),
}));

function createRouteSupabaseClient(session: Session): RouteSupabaseClient {
  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  }) as RouteSupabaseClient;

  client.auth.getUser = async () => ({
    data: { user: session.user },
    error: null,
  });

  return client;
}

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function createClientViaRoute(payload: {
  name: string;
  phone?: string;
  email: string;
  address?: string;
  notes?: string;
}) {
  const response = await POST(jsonRequest("http://local.test/api/clients", "POST", payload));
  const body = await response.json() as { client: ClientRow };
  createdClientIds.push(body.client.id);
  return { status: response.status, body };
}

async function fetchClientRow(id: string): Promise<ClientRow | null> {
  const { data, error } = await currentSupabaseClient
    .from("clients")
    .select("id, name, phone, email, address, notes")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ClientRow | null;
}

beforeEach(async () => {
  const user = makeUser("vitest-client", "integration123!");
  currentSession = await createSession(user.email, user.password);
  currentSupabaseClient = createRouteSupabaseClient(currentSession);
  createdClientIds = [];
}, 30_000);

afterEach(async () => {
  if (createdClientIds.length === 0) {
    return;
  }

  await currentSupabaseClient.from("clients").delete().in("id", createdClientIds);
}, 10_000);

describe.sequential("Client CRUD route integration", () => {
  it("creating a client with valid data really saves it and returns it with an id", async () => {
    const payload = {
      name: "Integration Client",
      phone: "07700 900123",
      email: "integration@example.com",
      address: "1 Test Lane",
      notes: "Created from vitest",
    };

    const { status, body } = await createClientViaRoute(payload);

    expect(status).toBe(201);
    expect(body.client.id).toEqual(expect.any(String));
    expect(body.client).toMatchObject(payload);

    const persistedRow = await fetchClientRow(body.client.id);
    expect(persistedRow).toMatchObject(payload);
  }, 30_000);

  it("creating a client with an empty name fails with a clear validation error", async () => {
    const response = await POST(
      jsonRequest("http://local.test/api/clients", "POST", {
        name: "   ",
        phone: "07700 900123",
        email: "integration@example.com",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Name is required" });
  }, 30_000);

  it("editing a client updates the right row", async () => {
    const first = await createClientViaRoute({
      name: "First Client",
      phone: "07700 900111",
      email: "first@example.com",
    });
    const second = await createClientViaRoute({
      name: "Second Client",
      phone: "07700 900222",
      email: "second@example.com",
    });

    const response = await PUT(
      jsonRequest(`http://local.test/api/clients/${first.body.client.id}`, "PUT", {
        name: "First Client Updated",
        phone: "07700 999999",
        email: "first.updated@example.com",
      }),
      { params: Promise.resolve({ id: first.body.client.id }) },
    );

    const body = await response.json() as { client: ClientRow };

    expect(response.status).toBe(200);
    expect(body.client.id).toBe(first.body.client.id);
    expect(body.client).toMatchObject({
      name: "First Client Updated",
      phone: "07700 999999",
      email: "first.updated@example.com",
    });

    const updatedFirst = await fetchClientRow(first.body.client.id);
    const untouchedSecond = await fetchClientRow(second.body.client.id);

    expect(updatedFirst).toMatchObject({
      id: first.body.client.id,
      name: "First Client Updated",
      phone: "07700 999999",
      email: "first.updated@example.com",
    });
    expect(untouchedSecond).toMatchObject({
      id: second.body.client.id,
      name: "Second Client",
      phone: "07700 900222",
      email: "second@example.com",
    });
  }, 30_000);

  it("deleting a client removes it", async () => {
    const created = await createClientViaRoute({
      name: "Delete Me",
      phone: "07700 900333",
      email: "deleteme@example.com",
    });

    const response = await DELETE(
      jsonRequest(`http://local.test/api/clients/${created.body.client.id}`, "DELETE"),
      { params: Promise.resolve({ id: created.body.client.id }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });

    createdClientIds = createdClientIds.filter((id) => id !== created.body.client.id);
    await expect(fetchClientRow(created.body.client.id)).resolves.toBeNull();

    const getResponse = await GET(
      jsonRequest(`http://local.test/api/clients/${created.body.client.id}`, "GET"),
      { params: Promise.resolve({ id: created.body.client.id }) },
    );
    expect(getResponse.status).toBe(404);
  }, 30_000);
});
