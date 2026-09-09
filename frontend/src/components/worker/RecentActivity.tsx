import React from "react";
import { Eye, Check, Send } from "lucide-react";

export interface ActivityItem {
  id: string | number;
  type: "viewed" | "accepted" | "sent";
  title: React.ReactNode;
  time: string;
  tag: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

interface RecentActivityProps {
  title?: string;
  onViewAll?: () => void;
  activities?: ActivityItem[];
  className?: string;
}

const defaultActivities: ActivityItem[] = [
  {
    id: "1",
    type: "viewed",
    title: (
      <span>
        <strong className="font-semibold text-slate-900">TechCorp Inc.</strong>{" "}
        viewed your proposal for{" "}
        <strong className="font-semibold text-slate-900">
          Frontend UI Developer
        </strong>
      </span>
    ),
    time: "2 hours ago",
    tag: "Remote",
  },
  {
    id: "2",
    type: "accepted",
    title: (
      <span>
        <strong className="font-semibold text-slate-900">Sarah Jenkins</strong>{" "}
        accepted your offer for{" "}
        <strong className="font-semibold text-slate-900">
          Local Event Photography
        </strong>
      </span>
    ),
    time: "5 hours ago",
    tag: "Local - Seattle",
    actionButton: {
      label: "Message",
      onClick: () => {},
    },
  },
  {
    id: "3",
    type: "sent",
    title: (
      <span>
        You sent a proposal for{" "}
        <strong className="font-semibold text-slate-900">
          Shopify Store Setup
        </strong>
      </span>
    ),
    time: "Yesterday",
    tag: "Remote",
  },
];

export const RecentActivity: React.FC<RecentActivityProps> = ({
  title = "Recent Activity",
  onViewAll,
  activities = defaultActivities,
  className = "",
}) => {
  const renderIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "viewed":
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#1877f2] shrink-0">
            <Eye className="w-5 h-5 stroke-[1.75]" />
          </div>
        );
      case "accepted":
        return (
          <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-white shrink-0">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
        );
      case "sent":
        return (
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <Send className="w-4 h-4 stroke-[1.75] translate-x-0.5" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`w-full ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs sm:text-sm font-semibold text-[#1877f2] hover:text-blue-700 transition-colors cursor-pointer"
        >
          View all
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 p-2 sm:p-3 rounded-2xl hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              {renderIcon(item.type)}
              <div className="min-w-0 pt-0.5">
                <p className="text-xs sm:text-sm text-slate-700 leading-snug">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-normal">
                    {item.time}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                    {item.tag}
                  </span>
                </div>
              </div>
            </div>

            {item.actionButton && (
              <button
                type="button"
                onClick={item.actionButton.onClick}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                {item.actionButton.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentActivity;
