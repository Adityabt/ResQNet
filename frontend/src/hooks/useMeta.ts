import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { Meta } from "../lib/types";

let cached: Meta | null = null;

export function useMeta(): { meta: Meta | null; error: string | null } {
  const [meta, setMeta] = useState<Meta | null>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) {
      return undefined;
    }
    let active = true;
    api
      .meta()
      .then((value) => {
        cached = value;
        if (active) {
          setMeta(value);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { meta, error };
}