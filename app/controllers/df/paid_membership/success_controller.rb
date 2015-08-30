module ::Df::PaidMembership class SuccessController < BaseController
	skip_before_filter :authorize_mini_profiler,
		:check_xhr,
		:inject_preview_style,
		:preload_json,
		:redirect_to_login_if_required,
		:set_current_user_for_logs,
		:set_locale,
		:set_mobile_view,
		:verify_authenticity_token
	def index
		log 'CUSTOMER RETURNED', params
		confirm_payment
		update_invoice
		grant_membership
		redirect_to "#{Discourse.base_url}/users/#{current_user.username}"
	end
	protected
	# @override
	def invoiceId
		@details ? @details.invoice_number : super
	end
	private
	def confirm_payment
		doExpressCheckoutPayment_params = {
			:action => 'Sale',
			:currency_code => invoice.currency,
			:amount => details.amount
		}
		log 'DoExpressCheckoutPayment REQUEST', doExpressCheckoutPayment_params
# https://developer.paypal.com/docs/classic/api/merchant/DoExpressCheckoutPayment_API_Operation_NVP/
# https://gist.github.com/xcommerce-gists/3502241
		response = paypal_express_request.checkout!(
			params['token'],
			params['PayerID'],
			Paypal::Payment::Request.new(doExpressCheckoutPayment_params)
		)
		log 'DoExpressCheckoutPayment RESPONSE', response.instance_values
	end
	# https://developer.paypal.com/docs/classic/api/merchant/GetExpressCheckoutDetails_API_Operation_NVP/
	# https://github.com/nov/paypal-express/wiki/Instant-Payment
	def details
		return @details if defined? @details
		@details = begin
			log 'GetExpressCheckoutDetails REQUEST'
			result = paypal_express_request.details(params['token'])
			log 'GetExpressCheckoutDetails RESPONSE', result.instance_values
			result
		end
	end
	def grant_membership
		groupIds = invoice.granted_group_ids.split ','
		groupIds.each do |groupId|
			groupId = groupId.to_i
			# http://stackoverflow.com/a/25274645
			groupUser = GroupUser.find_by user_id: current_user.id, group_id: groupId
			if groupUser.nil?
				group = Group.find_by id: groupId
				# 2015-07-11
				# Группа могла быть удалена
				if group
					groupUser = GroupUser.new
					groupUser.user = current_user
					groupUser.group = group
					groupUser.save
					log "GRANTED MEMBERSHIP in «#{group.name}»"
				end
			end
		end
	end
	def invoice
		return @invoice if defined? @invoice
		@invoice = Invoice.find_by id: details.invoice_number
	end
	def update_invoice
		# http://stackoverflow.com/a/18811305
		currentTime = DateTime.current
		invoice.paid_at = DateTime.current
		case invoice.tier_period_units
			when 'y'
				advanceUnits = :years
			when 'm'
				advanceUnits = :months
			when 'd'
				advanceUnits = :days
		end
		invoice.membership_till = DateTime.current.advance advanceUnits => +invoice.tier_period
		invoice.save
		log 'INVOICE UPDATED', invoice.attributes
	end
end end