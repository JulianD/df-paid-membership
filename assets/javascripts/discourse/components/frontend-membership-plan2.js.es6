/**
 * 2016-12-10
 * Раньше название компонента было «frontend-membership-plan-2».
 * Однако с текущей версией Ember.js (2.4.6, а раньше, видимо, использовалась версия 1.x),
 * компоненты с именами, у которых окончание после дефиса является цифрой,
 * больше не работают правильно:
 * шаблон *.hbs по-прежнему работает, но вот класс *.js.es6 (данный файл)
 * больше не обрабатывается системой.
 * По этой причине изменил окончание, убрав дефис перед цифрой.
 */
export default Ember.Component.extend({
	classNames: ['options']
	,_didInsertElement: function() {
		this.$().css({'border-color': '#' + this.get('plan').get('color').background});
		// 2016-12-21
		// https://github.com/discourse-pro/df-paid-membership/issues/14
		// «A plan's options are wrongly positioned in a mobile browser».
		var _this = this;
		//noinspection PlatformDetectionJS
		/** @type {Boolean} */
		var isProblemMobile = /(android|iphone)/i.test(navigator.userAgent);
		/** @type {Boolean} */
		var isTheHornedFrog = 'forum.thehornedfrog.com' === location.hostname;
		/** @type {Number} */
		var adjTop = isProblemMobile && isTheHornedFrog ? -1 : 0;
		/** @type {Number} */
		var adjLeft = isProblemMobile && isTheHornedFrog ? 2 : 0;
		this.$(':radio').each(function() {
			/** @type {jQuery} HTMLInputElement */
			var $radio = _this.$(':radio');
			/** @type {jQuery} HTMLDivElement */
			var $div = $radio.siblings('div');
			$radio.css('margin-top', (Math.round(($div.height() - $radio.height()) / 2) + adjTop) + 'px');
			$div.css('margin-left', adjLeft + 'px');
		});
	}.on('didInsertElement')
	,_init: function() {
		const plan = this.get('plan');
		const tiers = plan.priceTiers;
		// 2015-07-26
		// В JavaScript приведение пустого массива к логическому типу возвращает true,
		// в отличие от PHP.
		if (tiers && tiers.length) {
			const getPeriodUnitsLabel = function(tier) {
				const period = parseInt(tier.period);
				return I18n.t('paid_membership.price_tier.period_units.' + tier.periodUnits + '.' + (
					(1 === period)
					? '1'
					: ('ru' !== I18n.currentLocale())
						? 'many'
					  	: (5 > period ? '2' : '5')
			  	));
			};
			tiers.forEach(function(tier) {
				tier.periodUnitsLabel = getPeriodUnitsLabel(tier);
			});
			// 2015-07-08
			// По-умолчанию выбираем последнюю (подразумевается, что самую дорогую) опцию.
			this.set('selection', tiers[tiers.length - 1].id);
		}
		this.set('notLoggedIn', !Discourse.User.current());
		this.set('optionName', 'plan_' + plan.id + '_price_tier');
		/** @type {Number} */
		const trialPeriod = Discourse.SiteSettings['«Paid_Membership»_Trial_Period'];
		if (trialPeriod) {
			this.set('trialPeriodText', I18n.t(
				'paid_membership.frontend.trial_period_text', {days: trialPeriod}
			));
		}
	}.on('init')
});
