"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WidgetName } from "@/content/types";

export type WidgetProps = { props?: Record<string, unknown> };

const Loading = () => <div className="card my-8 h-40 animate-pulse" aria-busy />;
const w = (loader: () => Promise<{ default: ComponentType<WidgetProps> }>) => dynamic(loader, { loading: Loading });

const registry: Record<WidgetName, ComponentType<WidgetProps>> = {
  "base-converter": w(() => import("./base-converter")),
  caesar: w(() => import("./caesar")),
  vigenere: w(() => import("./vigenere")),
  xor: w(() => import("./xor")),
  hash: w(() => import("./hash")),
  "password-strength": w(() => import("./password-strength")),
  encoder: w(() => import("./encoder")),
  "tcp-handshake": w(() => import("./tcp-handshake")),
  "http-builder": w(() => import("./http-builder")),
  "dns-resolver": w(() => import("./dns-resolver")),
  "port-scan": w(() => import("./port-scan")),
  "packet-capture": w(() => import("./packet-capture")),
  "sqli-lab": w(() => import("./sqli-lab")),
  "xss-lab": w(() => import("./xss-lab")),
  jwt: w(() => import("./jwt")),
  phishing: w(() => import("./phishing")),
  "cia-triad": w(() => import("./cia-triad")),
  chmod: w(() => import("./chmod")),
  "log-analyzer": w(() => import("./log-analyzer")),
};

export function WidgetBlock({ widget, props }: { widget: WidgetName; props?: Record<string, unknown> }) {
  const C = registry[widget];
  if (!C) return <div className="card my-8 p-4 text-sm text-bad">Неизвестный виджет: {String(widget)}</div>;
  return <C props={props} />;
}
