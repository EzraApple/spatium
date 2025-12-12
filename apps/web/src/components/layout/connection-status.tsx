type ConnectionStatusProps = {
  status: "connecting" | "connected" | "reconnecting" | "disconnected"
  clientCount: number
  myColor: string | null
}

export function ConnectionStatus({
  status,
  clientCount,
  myColor,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-zinc-900/90 px-4 py-2 text-sm text-white backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            status === "connected"
              ? "bg-emerald-400"
              : status === "connecting" || status === "reconnecting"
                ? "bg-amber-400 animate-pulse"
                : "bg-red-400"
          }`}
        />
        <span className="text-zinc-400">
          {status === "connected"
            ? "Connected"
            : status === "connecting"
              ? "Connecting..."
              : status === "reconnecting"
                ? "Reconnecting..."
                : "Disconnected"}
        </span>
      </div>
      {status === "connected" && (
        <>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            {myColor && (
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: myColor }}
              />
            )}
            <span>
              {clientCount} {clientCount === 1 ? "user" : "users"} online
            </span>
          </div>
        </>
      )}
    </div>
  )
}
