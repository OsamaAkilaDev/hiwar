import { Link } from "@tanstack/react-router";
import type { ConversationDTO } from "../../../../shared/events";
import { useT } from "../../../i18n";

type Props = {
  conversation: ConversationDTO;
  active: boolean;
  onNavigate?: () => void;
};

export function ConversationItem({
  conversation: { id, title },
  active,
  onNavigate,
}: Props) {
  const t = useT();
  const label = title ?? t("newChat");

  return (
    <li className="group relative rounded-lg">
      <Link
        to="/chat/$conversationId"
        params={{ conversationId: id }}
        preload="intent"
        title={label}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`block truncate rounded-lg py-2 ps-3 pe-16 text-sm hover:bg-surface-2 hover:text-fg ${active ? "bg-surface-2 text-fg" : "text-fg-muted"}`}
      >
        {label}
      </Link>
    </li>
  );
}
