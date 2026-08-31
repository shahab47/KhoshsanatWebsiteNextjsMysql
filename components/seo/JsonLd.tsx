// components/seo/JsonLd.tsx
import React from 'react';

interface JsonLdProps {
  data: Record<string, any> | Array<Record<string, any>>;
  id?: string;
}

export default function JsonLd({ data, id }: JsonLdProps) {
  if (!data) return null;

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
