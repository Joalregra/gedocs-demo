import { DocumentTextIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { useContext } from "react";
import { MailContext } from "@/context/MailContext/MailContext";

export default function InboxMailCard({ card }) {
    const { selectedMail, setSelectedMail } = useContext(MailContext);

    const getDeadlineColor = (createdDateStr, responseDateStr, responseDays) => {
        if (!responseDateStr) return "text-gray-500";

        const now = new Date();
        const deadline = new Date(responseDateStr);

        let totalDuration;
        if (responseDays) {
            totalDuration = responseDays * 24 * 60 * 60 * 1000;
        } else if (createdDateStr) {
            const created = new Date(createdDateStr);
            totalDuration = deadline.getTime() - created.getTime();
        } else {
            return "text-gray-500";
        }

        const timeRemaining = deadline.getTime() - now.getTime();

        const remainingPercentage = totalDuration > 0
            ? (timeRemaining / totalDuration) * 100
            : 0;

        if (remainingPercentage > 80) return "text-primary";
        if (remainingPercentage > 40 && remainingPercentage <= 80) return "text-[#F0DA30]";
        return "text-red-600";
    };

    return (
        <div
            className={`w-full p-4 border border-base-300 bg-white rounded-lg flex items-center gap-3 mb-3 overflow-hidden cursor-pointer
        ${
            selectedMail === card.id
                ? "border-primary border-3 "
                : " hover:bg-gray-100"
        }
    `}
            onClick={() => setSelectedMail(card.id)}
        >
            <div
                id="selector"
                className="h-20 w-1 rounded-xl bg-primary/30 shrink-0"
            ></div>

            <div className="flex-1 min-w-0 ">
                <div
                    id="mail-card-tags"
                    className="flex flex-wrap items-start justify-between gap-2"
                >
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <div
                            id="mail-card-type"
                            className={`bg-black py-1 px-2 rounded-md text-sm shrink-0
                                ${
                                    selectedMail === card.id
                                        ? "bg-primary font-bold text-white"
                                        : "bg-gray-100 hover:bg-gray-100"
                                }
                                `}
                        >
                            {card.request_type}
                        </div>
                        <div
                            id="mail-card-serial"
                            className="text-sm truncate max-w-20 sm:max-w-[120px]"
                        >
                            {card.id}
                        </div>
                        <div id="mail-card-date" className="text-sm shrink-0">
                            {new Date(card.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="text-right text-sm shrink-0">
                        <div>Límite</div>
                        {card.response_date ? (
                            <div className="font-medium text-[#34A853]">Respondida</div>
                        ) : card.response_time ? (
                            new Date() > new Date(card.response_time) ? (
                                <div className="font-medium text-red-600">Vencida</div>
                            ) : (
                                <div className={`font-medium ${getDeadlineColor(card.created_at, card.response_time, card.response_days)}`}>
                                    {new Date(card.response_time).toLocaleDateString()}
                                </div>
                            )
                        ) : (
                            <div className="font-medium text-gray-500">
                                Sin asignar
                            </div>
                        )}
                    </div>
                </div>

                <div id="mail-card-content" className="mt-2 mb-3 min-w-0">
                    <h3
                        id="mail-card-subject"
                        className="font-semibold truncate"
                    >
                        {card.affair}
                    </h3>
                    <p
                        id="mail-card-description"
                        className="text-gray-600 text-sm overflow-hidden text-ellipsis line-clamp-1"
                    >
                        {card.description}
                    </p>
                </div>

                <div
                    id="mail-card-footer"
                    className="flex justify-between items-center min-w-0"
                >
                    <div
                        id="mail-card-sender"
                        className="flex items-center gap-1 min-w-0"
                    >
                        <UserCircleIcon className="w-5 shrink-0" />
                        <div className="truncate text-sm max-w-[120px] sm:max-w-[200px]">
                            {card.user_id}
                        </div>
                    </div>
                    <DocumentTextIcon className="w-5 shrink-0" />
                </div>
            </div>
        </div>
    );
}
