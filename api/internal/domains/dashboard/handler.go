package dashboard

import (
	"net/http"
	"strconv"

	"hi-cfo/api/internal/logger"
	//customerrors "hi-cfo/api/internal/shared/errors"

	"hi-cfo/api/internal/shared"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type DashboardHandler struct {
	shared.BaseHandler
	service *DashboardService
	logger  *logrus.Entry
}

func NewDashboardHandler(service *DashboardService) *DashboardHandler {
	return &DashboardHandler{
		service: service,
		logger:  logger.WithDomain("account"),
	}
}

// GetOverview handles GET /dashboard/overview
func (h *DashboardHandler) GetOverview(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}
	overview, err := h.service.GetOverview(c.Request.Context(), userID)
	if err != nil {
		h.RespondWithInternalError(c, "Failed to retrieve dashboard overview")
		return
	}
	h.RespondWithSuccess(c, http.StatusOK, overview, "Dashboard overview retrieved successfully")
}

// GetStats handles GET /dashboard/stats
func (h *DashboardHandler) GetStats(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Optional query parameters for filtering
	period := c.DefaultQuery("period", "30d") // 7d, 30d, 90d, 1y
	category := c.Query("category")

	stats, err := h.service.GetStats(c.Request.Context(), userID, period, category)
	if err != nil {
		h.RespondWithInternalError(c, "Failed to retrieve dashboard stats")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, stats, "Dashboard stats retrieved successfully")
}

// GetReports handles GET /dashboard/reports
func (h *DashboardHandler) GetReports(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Optional pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	reportTypeStr := c.Query("type") // financial, expense, revenue, etc.
	reportType, err := strconv.Atoi(reportTypeStr)
	if reportTypeStr != "" && err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}
	reports, err := h.service.GetReports(c.Request.Context(), userID, reportType, page, strconv.Itoa(limit))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reports"})
		return
	}
	h.RespondWithSuccess(c, http.StatusOK, reports, "Dashboard reports retrieved successfully")
}
