"use client";

import { Check, ImagePlus, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AmenityIcon } from "@/components/AmenityIcon";
import { useToast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import {
  createListing,
  getAmenities,
  getCategories,
  getListing,
  updateListing,
  uploadImage,
} from "@/lib/api";
import type { Amenity, ListingPayload } from "@/lib/types";

const PROPERTY_TYPES = [
  "House",
  "Apartment",
  "Cabin",
  "Villa",
  "Loft",
  "Cottage",
  "Tiny home",
  "Condo",
  "Chalet",
  "Treehouse",
];

/** Numeric fields are held as strings so the inputs can be empty while typing. */
interface FormState {
  title: string;
  description: string;
  category: string;
  property_type: string;
  location: string;
  city: string;
  country: string;
  price_per_night: string;
  cleaning_fee: string;
  service_fee: string;
  max_guests: string;
  bedrooms: string;
  beds: string;
  baths: string;
  latitude: string;
  longitude: string;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  category: "",
  property_type: "House",
  location: "",
  city: "",
  country: "",
  price_per_night: "",
  cleaning_fee: "0",
  service_fee: "0",
  max_guests: "2",
  bedrooms: "1",
  beds: "1",
  baths: "1",
  latitude: "0",
  longitude: "0",
};

/**
 * Create/edit listing form. Doubles as the "Become a host" page: when no
 * `editId` is passed it creates, otherwise it prefills and updates.
 */
export function ListingForm({ editId }: { editId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const { user, isHost, toggleRole } = useUser();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [imageDraft, setImageDraft] = useState("");
  const [amenityIds, setAmenityIds] = useState<number[]>([]);

  const [categories, setCategories] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const [loading, setLoading] = useState(Boolean(editId));
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load reference data, and in edit mode the listing being edited.
  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
    getAmenities().then(setAmenities).catch(() => setAmenities([]));
  }, []);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    setLoading(true);
    getListing(editId, user?.id)
      .then((listing) => {
        if (!active) return;
        setForm({
          title: listing.title,
          description: listing.description,
          category: listing.category,
          property_type: listing.property_type,
          location: listing.location,
          city: listing.city,
          country: listing.country,
          price_per_night: String(listing.price_per_night),
          cleaning_fee: String(listing.cleaning_fee),
          service_fee: String(listing.service_fee),
          max_guests: String(listing.max_guests),
          bedrooms: String(listing.bedrooms),
          beds: String(listing.beds),
          baths: String(listing.baths),
          latitude: String(listing.latitude),
          longitude: String(listing.longitude),
        });
        setImages(listing.images.map((image) => image.url));
        setAmenityIds(listing.amenities.map((amenity) => amenity.id));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editId, user?.id]);

  // Default the category to the first available one on create.
  useEffect(() => {
    if (!editId && !form.category && categories.length > 0) {
      setForm((current) => ({ ...current, category: categories[0] }));
    }
  }, [categories, editId, form.category]);

  const setField = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const addImage = () => {
    const url = imageDraft.trim();
    if (!url) return;
    setImages((current) => [...current, url]);
    setImageDraft("");
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    event.target.value = "";
    if (!file || !user) return;

    setUploading(true);
    try {
      const { url } = await uploadImage(file, user.id);
      setImages((current) => [...current, url]);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleAmenity = (id: number) => {
    setAmenityIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const validate = (): string | null => {
    if (form.title.trim().length < 5) return "Title must be at least 5 characters.";
    if (form.description.trim().length < 10)
      return "Description must be at least 10 characters.";
    if (!form.category) return "Please choose a category.";
    if (!form.location.trim() || !form.city.trim() || !form.country.trim())
      return "Location, city and country are required.";
    if (!(Number(form.price_per_night) > 0)) return "Price per night must be greater than 0.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !isHost) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const payload: ListingPayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      property_type: form.property_type,
      location: form.location.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      price_per_night: Number(form.price_per_night) || 0,
      cleaning_fee: Number(form.cleaning_fee) || 0,
      service_fee: Number(form.service_fee) || 0,
      max_guests: Number(form.max_guests) || 1,
      bedrooms: Number(form.bedrooms) || 0,
      beds: Number(form.beds) || 1,
      baths: Number(form.baths) || 1,
      latitude: Number(form.latitude) || 0,
      longitude: Number(form.longitude) || 0,
      image_urls: images,
      amenity_ids: amenityIds,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (editId) {
        await updateListing(editId, payload, user.id);
        toast.success("Listing updated");
      } else {
        await createListing(payload, user.id);
        toast.success("Listing created");
      }
      router.push("/host");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Guest view: hosting requires the host profile -------------------------
  if (!isHost) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Become a host</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Switch to hosting mode to create and manage listings.
        </p>
        <button
          type="button"
          onClick={toggleRole}
          className="mt-8 rounded-xl bg-rausch px-6 py-3 font-semibold text-white transition-colors hover:bg-rausch-dark"
        >
          Switch to hosting
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-6 py-10">
        <div className="h-8 w-1/2 rounded bg-hairline-soft" />
        <div className="mt-6 h-64 rounded-2xl bg-hairline-soft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">
        {editId ? "Edit your listing" : "Become a host"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Share the essentials — you can refine everything later.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Basics */}
        <Section title="The basics">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              placeholder="e.g. Oceanfront villa with private pool"
              className="input"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={5}
              placeholder="Describe the space, the neighbourhood and what makes it special."
              className="input resize-y"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(event) => setField("category", event.target.value)}
                className="input"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Property type">
              <select
                value={form.property_type}
                onChange={(event) => setField("property_type", event.target.value)}
                className="input"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="Location">
          <Field label="Neighbourhood / area">
            <input
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
              placeholder="e.g. Point Dume"
              className="input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
                placeholder="e.g. Malibu"
                className="input"
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={(event) => setField("country", event.target.value)}
                placeholder="e.g. United States"
                className="input"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitude">
              <input
                value={form.latitude}
                onChange={(event) => setField("latitude", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Longitude">
              <input
                value={form.longitude}
                onChange={(event) => setField("longitude", event.target.value)}
                className="input"
              />
            </Field>
          </div>
        </Section>

        {/* Pricing & capacity */}
        <Section title="Pricing and capacity">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price / night ($)">
              <input
                type="number"
                min={0}
                value={form.price_per_night}
                onChange={(event) => setField("price_per_night", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Cleaning fee ($)">
              <input
                type="number"
                min={0}
                value={form.cleaning_fee}
                onChange={(event) => setField("cleaning_fee", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Service fee ($)">
              <input
                type="number"
                min={0}
                value={form.service_fee}
                onChange={(event) => setField("service_fee", event.target.value)}
                className="input"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Max guests">
              <input
                type="number"
                min={1}
                value={form.max_guests}
                onChange={(event) => setField("max_guests", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Bedrooms">
              <input
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(event) => setField("bedrooms", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Beds">
              <input
                type="number"
                min={1}
                value={form.beds}
                onChange={(event) => setField("beds", event.target.value)}
                className="input"
              />
            </Field>
            <Field label="Baths">
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.baths}
                onChange={(event) => setField("baths", event.target.value)}
                className="input"
              />
            </Field>
          </div>
        </Section>

        {/* Photos */}
        <Section title="Photos">
          <div className="flex flex-wrap gap-2">
            <input
              value={imageDraft}
              onChange={(event) => setImageDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addImage();
                }
              }}
              placeholder="Paste an image URL"
              className="input min-w-[200px] flex-1"
            />
            <button
              type="button"
              onClick={addImage}
              className="flex items-center gap-2 rounded-xl border border-hairline px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              <ImagePlus className="h-4 w-4" />
              Add
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl border border-hairline px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFile}
            />
          </div>
          <p className="text-xs text-muted">
            The first photo becomes the listing&apos;s primary image.
          </p>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((url, index) => (
                <div key={url + index} className="relative h-24 w-32 overflow-hidden rounded-xl border border-hairline">
                  <Image src={url} alt={`Photo ${index + 1}`} fill sizes="128px" className="object-cover" />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-rausch hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Amenities */}
        <Section title="Amenities">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {amenities.map((amenity) => {
              const selected = amenityIds.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    selected ? "border-ink bg-surface" : "border-hairline hover:border-ink"
                  }`}
                >
                  <AmenityIcon name={amenity.icon_name} className="h-5 w-5 text-ink" />
                  <span className="flex-1">{amenity.name}</span>
                  {selected && <Check className="h-4 w-4 text-rausch" />}
                </button>
              );
            })}
          </div>
        </Section>

        {error && <p className="text-sm text-rausch">{error}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-hairline-soft pt-6">
          <button
            type="button"
            onClick={() => router.push("/host")}
            className="rounded-xl border border-hairline px-5 py-3 text-sm font-medium hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-rausch px-6 py-3 text-sm font-semibold text-white hover:bg-rausch-dark disabled:opacity-60"
          >
            {submitting
              ? "Saving…"
              : editId
                ? "Save changes"
                : "Publish listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
