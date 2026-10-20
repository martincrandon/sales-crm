"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { getApprovedSession } from "@/lib/auth";
import { validateContactInput } from "@/lib/contacts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recordId(formData: FormData) {
  const value = formData.get("id");
  if (value === null || value === "") return null;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : false;
}

export async function saveContact(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getApprovedSession();
  if (!session) return { error: "Your session has expired. Sign in again." };

  const validated = validateContactInput({
    name: formData.get("name"),
    email: formData.get("email"),
    emails: formData.get("emails"),
    phone: formData.get("phone"),
    job_title: formData.get("job_title"),
    notes: formData.get("notes"),
  });
  if (!validated.data) return { error: validated.error };

  const id = recordId(formData);
  if (id === false) return { error: "This contact record is not valid." };

  try {
    const result = id
      ? await session.supabase
          .from("contacts")
          .update(validated.data)
          .eq("id", id)
          .select("id")
          .maybeSingle()
      : await session.supabase
          .from("contacts")
          .insert(validated.data)
          .select("id")
          .single();

    if (result.error) {
      return { error: "Couldn't save this contact. Check the database setup and try again." };
    }
    if (!result.data) {
      return { error: "This contact no longer exists or isn't available to you." };
    }
  } catch {
    return { error: "Couldn't save this contact. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/contacts");
  return { success: true };
}

export async function deleteContact(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getApprovedSession();
  if (!session) return { error: "Your session has expired. Sign in again." };

  const id = recordId(formData);
  if (id === null || id === false) {
    return { error: "This contact record is not valid." };
  }

  try {
    const { data, error } = await session.supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return { error: "Couldn't delete this contact. Try again." };
    if (!data) return { error: "This contact no longer exists or isn't available to you." };
  } catch {
    return { error: "Couldn't delete this contact. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/contacts");
  return { success: true };
}
