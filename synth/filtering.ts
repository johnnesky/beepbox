/*
This file contains code to compute digital audio filter coefficients based on
the desired type, cutoff frequency, and other parameters. You can use these
coefficients to apply the filter to audio samples. It also contains code to
analyze these filters, which is useful for graphically displaying their effects.

All of the filters in this file are known as "Infinite Impulse Response" or IIR
filters, because older output samples contribute feedback to newer output
samples and thus contribute to all future samples, although typically filters
are design to reduce the contribution of older samples over time.

Low-pass filters aka high-cut filters preserve audio signals below the cutoff
frequency, and attenuate audio signals above the cutoff frequency. High-pass
filters aka low-cut filters are the reverse. All-pass filters do not affect the
volume of the signal at all but induce phase changes above the cutoff frequency.
Peak/Notch filters maintain the volume on either side of the cutoff frequency,
but raise or lower the volume at that frequency. 

The number of old samples used in the filter determines the "order" of the
filter. First-order filters generally have shallower slopes, and second-order
filters generally have steeper slopes and can be configured to "resonate",
meaning they have a louder peak at the cutoff frequency. This file contains
first-order filters and second-order filters, meaning one or two older samples
are involved, as well as the current input sample.

The class FilterCoefficients is defined lower in this file. You can use it to
set up a first order filter like this:

	const cutoffRadiansPerSample: number = 2 * Math.PI * cutoffHz / sampleRate;
	const filter: FilterCoefficients = new FilterCoefficients();
	filter.lowPass1stOrderButterworth(cutoffRadiansPerSample);
	// output sample coefficients are conventionally called a0, a1, etc. Note
	// that a[0] is typically normalized to 1.0 and need not be used directly.
	const a: number[] = filter.a;
	// input sample coefficients are conventionally called b0, b1, etc
	const b: number[] = filter.b;
	// filter input samples, x[0] is the most recent, x[1] is the previous one, etc.
	const x: number[] = [0, 0, 0];
	// filter output samples, y[0] will be computed by the filter based on input
	// samples and older output samples.
	const y: number[] = [0, 0, 0];

Then to apply the first-order filter to samples inside a loop, using the current
input sample (x[0]) as well as previous input and output samples, do this:

	// Compute the next output sample y[0]:
	y[0] = b[0] * x[0] + b[1] * x[1] - a[1] * y[1];
	// Remember the input and output samples for next time:
	x[1] = x[0];
	y[1] = y[0];

2nd order filters are similar, but have more parameters and require more old
samples:

	// Compute the next output sample y[0]:
	y[0] = b[0] * x[0] + b[1] * x[1] + b[2] * x[2] - a[1] * y[1] - a[2] * y[2];
	// Remember the input and output samples for next time:
	x[2] = x[1];
	x[1] = x[0];
	y[2] = y[1];
	y[1] = y[0];

You can compose multiple filters into a higher order filter, although doing so
reduces the numerical stability of the filter:

	filter3.combination(filter1, filter2);
	// filter3.order will equal: filter1.order + filter2.order
	// The number of coefficients in filter3.a and filter3.b will be: order + 1

This file also contains a class called FrequencyResponse. You can use it to
determine how much gain or attenuation a filter would apply to sounds at a
specific input frequency, as well as the phase offset:

	const inputRadians: number = 2 * Math.PI * cutoffHz / sampleRate;
	const response: FrequencyResponse = new FrequencyResponse();
	response.analyze(filter, inputRadians);
	const gainResponse = response.magnitude();
	const phaseResponse = response.angle();

That's basically all you need to know to use this code, but I'll also explain
how the analysis works.

A first-order digital IIR filter is ordinarily implemented in a form like this:

	output = inputCoeff * input + prevInputCoeff * prevInput - prevOutputCoeff * prevOutput;

If we adopt standard naming conventions for audio filters, this same code would
instead look like:

	// x0 = current input, x1 = prevInput, y0 = current output, y1 = prevOutput
	y0 = b0*x0 + b1*x1 - a1*y1;

Leaving behind the world of code for a moment and entering the world of algebra,
we can rewrite this equation by moving all the output terms to the left side,
and we can add a coefficient to the y0 term called a0 (which is typically
normalized to 1.0, which is why I didn't bother including it until now):

	a0*y0 + a1*y1 = b0*x0 + b1*x1

This is known as the symmetrical form of the filter, and it will help us analyze
the impact of the filter on an input audio signal. Here's a lesson that helped
me understand the symmetrical form:
https://web.archive.org/web/20200626183458/http://123.physics.ucdavis.edu/week_5_files/filters/digital_filter.pdf

The end of that lesson introduces a concept called the "delay operator" which
looks like "z^-1", which (magically) turns a sample into the previous sample
when you multiply them. For example:

	x0 * z^-1 = x1

The lesson doesn't explain how it actually works. Audio signals aren't always
predictable, which means that you generally can't do math on a single sample to
compute what the previous sample was. However, some audio signals ARE
predictable, such as pure sine waves. Fortunately, all audio signals can be
broken down into a sum of independent sine waves. We can pick one sine wave at a
time, and use it to analyze the filter's impact on waves at that frequency. In
practice, this tells us what the filter will do to unpredictable input samples
that contain a partial sine wave at that frequency.

Technically, you can't just use a single sine wave sample to determine the
previous sine wave sample, because each possible value is passed going upwards
and downwards once per period and the direction is ambigous. This is where we
need to move into the complex number domain, where the real and imaginary
components can provide enough information to compute the previous position on
the input signal. So now instead of talking about sine waves, we're talking
about waves where the imaginary component is a sine wave and the real component
is a cosine wave at the same frequency. Together, they trace around a unit
circle in the complex domain, and each sample is just a consistent rotation
applied to the previous sample. The "delay operator" described above, z^-1, is
this same rotation applied in reverse, and it can be computed as:

	z^-1 = cos(radiansPerSample) - i * sin(radiansPerSample)

Math nerds may be interested to know that "Euler's formula" was used here, but
explaining what that means is probably beyond the scope of this documentation
aside from noting that a complex number on the unit circle represents a 2D
rotation that you can apply via multiplication.

Now we can rewrite the symmetrical form using the delay operator and algebra:

	a0*y0 + a1*y0*z^-1 = b0*x0 + b1*x0*z^-1
	y0 * (a0 + a1*z^-1) = x0 * (b0 + b1*z^-1)
	y0 = x0 * (b0 + b1*z^-1) / (a0 + a1*z^-1)
	y0 / x0 = (b0 + b1*z^-1) / (a0 + a1*z^-1)

That last equation expresses the relationship between the input and output
signals (y0/x0) in terms of the filter coefficients and delay operator. At this
point, the specific values of the input and output samples don't even matter!
This is called the "transfer function", and it's conventionally named "H(z)":

	H(z) = (b0 + b1*z^-1) / (a0 + a1*z^-1)

If you plug in actual filter coefficients and express the delay operators as
complex numbers with the appropriate trigonometry functions, the transfer
function can be computed and produces a complex number that represents the
relationship between the input and output signals, whose magnitude represents
the volume gain (or attenuation) of signals at that frequency, and whose angle
represents how much phase shift is applied by the filter to signals at that
frequency.

(Note that in order to compute the transfer function, you'll need to do
something about the complex number in the denominator. It turns out you can turn
the denominator into a real number by multiplying both the numerator and
denominator by the complex conjugate of the denominator, which is just the
denominator with the imaginary component negated.)

Finally, I'll list some of the links that helped me understand filters and
provided some of the algorithms I that use here.

Here's where I found accurate 2nd order low-pass and high-pass digital filters:
https://web.archive.org/web/20120531011328/http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt

This page is how I found a link to the cookbook article above. It claims these
filters are Butterworth filters:
http://web.archive.org/web/20191213120120/https://crypto.stanford.edu/~blynn/sound/analog.html

I found the first-order digital Butterworth filter coefficients at:
https://www.researchgate.net/publication/338022014_Digital_Implementation_of_Butterworth_First-Order_Filter_Type_IIR

This meta-paper helped me understand how to make 2nd order peak/notch filters:
https://web.archive.org/web/20170706085655/https://www.thesounddesign.com/MIO/EQ-Coefficients.pdf

BeepBox originally used simpler low-pass filters that I adapted from SFXR:
https://www.drpetter.se/project_sfxr.html
For low cutoff frequencies, the simpler filters and the Butterworth filters are
nearly identical, but when closer to the nyquist frequency the simpler filters
create extra resonance.
*/

export class FilterCoefficients {
	public readonly a: number[] = [1.0]; // output coefficients (negated, keep a[0]=1)
	public readonly b: number[] = [1.0]; // input coefficients
	public order: number = 0;
	
	public linearGain0thOrder(linearGain: number): void {
		//a[0] = 1.0; // a0 should always be normalized to 1.0, no need to assign it directly.
		this.b[0] = linearGain;
		this.order = 0;
	}
	
	public lowPass1stOrderButterworth(cornerRadiansPerSample: number): void {
		// First-order Butterworth low-pass filter according to:
		// https://www.researchgate.net/publication/338022014_Digital_Implementation_of_Butterworth_First-Order_Filter_Type_IIR
		// A butterworth filter is one where the amplitude response is equal to:
		// 1 / √(1 + (freq / cutoffFreq)^(2 * order))
		const g: number = 1.0 / Math.tan(cornerRadiansPerSample * 0.5);
		const a0: number = 1.0 + g;
		this.a[1] = (1.0 - g) / a0;
		this.b[1] = this.b[0] = 1 / a0;
		this.order = 1;
	}
	
	public lowPass1stOrderSimplified(cornerRadiansPerSample: number): void {
		// The output of this filter is nearly identical to the 1st order
		// Butterworth low-pass above, except if the cutoff is set to nyquist/3,
		// then the output is the same as the input, and if the cutoff is higher
		// than that, then the output actually resonates at high frequencies
		// instead of attenuating.
		// I'm guessing this filter was converted from analog to digital using
		// the "matched z-transform" method instead of the "bilinear transform"
		// method. The difference is that the bilinear transform warps
		// frequencies so that the lowpass response of zero at analogue ∞hz maps
		// to the digital nyquist frequency, whereas the matched z-transform
		// preserves the frequency of the filter response but also adds the
		// reflected response from above the nyquist frequency.
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
		this.a[1] = g - 1.0;
		this.b[0] = g;
		this.b[1] = 0.0;
		/*
		// Alternatively:
		const g: number = 1.0 / (2.0 * Math.sin(cornerRadiansPerSample / 2));
		const a0: number = g;
		this.a[1] = (1.0 - g) / a0;
		this.b[0] = 1.0 / a0;
		this.b[1] = 0.0 / a0;
		*/
		this.order = 1;
	}
	
	public highPass1stOrderButterworth(cornerRadiansPerSample: number): void {
		// First-order Butterworth high-pass filter according to:
		// https://www.researchgate.net/publication/338022014_Digital_Implementation_of_Butterworth_First-Order_Filter_Type_IIR
		const g: number = 1.0 / Math.tan(cornerRadiansPerSample * 0.5);
		const a0: number = 1.0 + g;
		this.a[1] = (1.0 - g) / a0;
		this.b[0] = g / a0;
		this.b[1] = -g / a0;
		this.order = 1;
	}
	/*
	public highPass1stOrderSimplified(cornerRadiansPerSample: number): void {
		// The output of this filter is nearly identical to the 1st order
		// Butterworth high-pass above, except it resonates when the cutoff
		// appoaches the nyquist.
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
		this.a[1] = g - 1.0;
		this.b[0] = 1.0;
		this.b[1] = -1.0;
		this.order = 1;
	}
	*/
	public highShelf1stOrder(cornerRadiansPerSample: number, shelfLinearGain: number): void {
		// I had trouble figuring this one out because I couldn't find any
		// online algorithms that I understood. There are 3 degrees of freedom
		// and I could narrow down a couple of them based on the desired gain at
		// DC and nyquist, but getting the cutoff frequency correct took a
		// little bit of trial and error in my attempts to interpret page 53 of
		// this chapter: http://www.music.mcgill.ca/~ich/classes/FiltersChap2.pdf
		// Obviously I don't fully understand the bilinear transform yet!
		const tan: number = Math.tan(cornerRadiansPerSample * 0.5);
		const sqrtGain: number = Math.sqrt(shelfLinearGain);
		const g: number = (tan * sqrtGain - 1) / (tan * sqrtGain + 1.0);
		const a0: number = 1.0;
		this.a[1] = g / a0;
		this.b[0] = (1.0 + g + shelfLinearGain * (1.0 - g)) / (2.0 * a0);
		this.b[1] = (1.0 + g - shelfLinearGain * (1.0 - g)) / (2.0 * a0);
		this.order = 1;
	}
	
	public allPass1stOrderInvertPhaseAbove(cornerRadiansPerSample: number): void {
		const g: number = (Math.sin(cornerRadiansPerSample) - 1.0) / Math.cos(cornerRadiansPerSample);
		this.a[1] = g;
		this.b[0] = g;
		this.b[1] = 1.0;
		this.order = 1;
	}
	
	/*
	// I haven't found a practical use for this version of the all pass filter.
	// It seems to create a weird subharmonic when used in a delay feedback loop.
	public allPass1stOrderInvertPhaseBelow(cornerRadiansPerSample: number): void {
		const g: number = (Math.sin(cornerRadiansPerSample) - 1.0) / Math.cos(cornerRadiansPerSample);
		this.a[1] = g;
		this.b[0] = -g;
		this.b[1] = -1.0;
		this.order = 1;
	}
	*/
	
	public allPass1stOrderFractionalDelay(delay: number) {
		// Very similar to allPass1stOrderInvertPhaseAbove, but configured
		// differently and for a different purpose! Useful for interpolating
		// between samples in a delay line.
		const g: number = (1.0 - delay) / (1.0 + delay);
		this.a[1] = g;
		this.b[0] = g;
		this.b[1] = 1.0;
		this.order = 1;
	}
	
	public lowPass2ndOrderButterworth(cornerRadiansPerSample: number, peakLinearGain: number): void {
		// This is Butterworth if peakLinearGain=1/√2 according to:
		// http://web.archive.org/web/20191213120120/https://crypto.stanford.edu/~blynn/sound/analog.html
		// An interesting property is that if peakLinearGain=1/16 then the
		// output resembles a first-order lowpass at a cutoff 4 octaves lower,
		// although it gets distorted near the nyquist.
		const alpha: number = Math.sin(cornerRadiansPerSample) / (2.0 * peakLinearGain);
		const cos: number = Math.cos(cornerRadiansPerSample);
		const a0: number = 1.0 + alpha;
		this.a[1] = -2.0*cos / a0;
		this.a[2] = (1 - alpha) / a0;
		this.b[2] = this.b[0] = (1 - cos) / (2.0*a0);
		this.b[1] = (1 - cos) / a0;
		this.order = 2;
	}
	
	public lowPass2ndOrderSimplified(cornerRadiansPerSample: number, peakLinearGain: number): void {
		// This filter is adapted from the one in the SFXR source code:
		// https://www.drpetter.se/project_sfxr.html
		// The output is nearly identical to the resonant Butterworth low-pass
		// above, except it resonates too much when the cutoff appoaches the
		// nyquist. If the resonance is set to zero and the cutoff is set to
		// nyquist/3, then the output is the same as the input.
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample / 2.0);
		const filterResonance: number = 1.0 - 1.0 / (2.0 * peakLinearGain);
		const feedback: number = filterResonance + filterResonance / (1.0 - g);
		this.a[1] = 2.0*g + (g - 1.0) * g*feedback - 2.0;
		this.a[2] = (g - 1.0) * (g - g*feedback - 1.0);
		this.b[0] = g*g;
		this.b[1] = 0;
		this.b[2] = 0;
		this.order = 2;
	}
	
	public highPass2ndOrderButterworth(cornerRadiansPerSample: number, peakLinearGain: number): void {
		const alpha: number = Math.sin(cornerRadiansPerSample) / (2 * peakLinearGain);
		const cos: number = Math.cos(cornerRadiansPerSample);
		const a0: number = 1.0 + alpha;
		this.a[1] = -2.0*cos / a0;
		this.a[2] = (1.0 - alpha) / a0;
		this.b[2] = this.b[0] = (1.0 + cos) / (2.0*a0);
		this.b[1] = -(1.0 + cos) / a0;
		this.order = 2;
	}
	/*
	public highPass2ndOrderSimplified(cornerRadiansPerSample: number, peakLinearGain: number): void {
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
		const filterResonance: number = 1.0 - 1.0 / (2.0 * peakLinearGain);
		const feedback: number = filterResonance + filterResonance / (1.0 - g);
		this.a[1] = 2.0*g + (g - 1.0) * g*feedback - 2.0;
		this.a[2] = (g - 1.0) * (g - g*feedback - 1.0);
		this.b[0] = 1.0;
		this.b[1] = -2.0;
		this.b[2] = 1.0;
		this.order = 2;
	}
	*/
	public peak2ndOrder(cornerRadiansPerSample: number, peakLinearGain: number, bandWidthScale: number): void {
		const sqrtGain: number = Math.sqrt(peakLinearGain);
		const bandWidth: number = bandWidthScale * cornerRadiansPerSample / (sqrtGain >= 1 ? sqrtGain : 1/sqrtGain);
		//const bandWidth: number = bandWidthScale * cornerRadiansPerSample / Math.max(sqrtGain, 1.0);
		const alpha: number = Math.tan(bandWidth * 0.5);
		const a0: number = 1.0 + alpha / sqrtGain;
		this.b[0] = (1.0 + alpha * sqrtGain) / a0;
		this.b[1] = this.a[1] = -2.0 * Math.cos(cornerRadiansPerSample) / a0;
		this.b[2] = (1.0 - alpha * sqrtGain) / a0;
		this.a[2] = (1.0 - alpha / sqrtGain) / a0;
		this.order = 2;
	}
	/*
	// Create a higher order filter by combining two lower order filters.
	// However, making high order filters in this manner results in instability.
	// It is recommended to apply the 2nd order filters (biquads) in sequence instead.
	public combination(filter1: FilterCoefficients, filter2: FilterCoefficients): void {
		this.order = filter1.order + filter2.order;
		for (let i: number = 0; i <= this.order; i++) {
			this.a[i] = 0.0;
			this.b[i] = 0.0;
		}
		for (let i: number = 0; i <= filter1.order; i++) {
			for (let j: number = 0; j <= filter2.order; j++) {
				this.a[i + j] += filter1.a[i] * filter2.a[j];
				this.b[i + j] += filter1.b[i] * filter2.b[j];
			}
		}
	}
	
	public scaledDifference(other: FilterCoefficients, scale: number): void {
		if (other.order != this.order) throw new Error();
		for (let i: number = 0; i <= this.order; i++) {
			this.a[i] = (this.a[i] - other.a[i]) * scale;
			this.b[i] = (this.b[i] - other.b[i]) * scale;
		}
	}
	
	public copy(other: FilterCoefficients): void {
		this.order = other.order;
		for (let i: number = 0; i <= this.order; i++) {
			this.a[i] = other.a[i];
			this.b[i] = other.b[i];
		}
	}
	*/
}

export class FrequencyResponse {
	public real: number = 0.0;
	public imag: number = 0.0;
	public denom: number = 1.0;
	
	public analyze(filter: FilterCoefficients, radiansPerSample: number): void {
		this.analyzeComplex(filter, Math.cos(radiansPerSample), Math.sin(radiansPerSample));
	}
	
	public analyzeComplex(filter: FilterCoefficients, real: number, imag: number): void {
		const a: number[] = filter.a;
		const b: number[] = filter.b;
		const realZ1: number = real;
		const imagZ1: number = -imag;
		let realNum: number = b[0] + b[1] * realZ1;
		let imagNum: number = b[1] * imagZ1;
		let realDenom: number = 1.0 + a[1] * realZ1;
		let imagDenom: number = a[1] * imagZ1;
		let realZ: number = realZ1;
		let imagZ: number = imagZ1;
		for (let i: number = 2; i <= filter.order; i++) {
			const realTemp: number = realZ * realZ1 - imagZ * imagZ1;
			const imagTemp: number = realZ * imagZ1 + imagZ * realZ1;
			realZ = realTemp;
			imagZ = imagTemp;
			realNum += b[i] * realZ;
			imagNum += b[i] * imagZ;
			realDenom += a[i] * realZ;
			imagDenom += a[i] * imagZ;
		}
		this.denom = realDenom * realDenom + imagDenom * imagDenom;
		this.real = realNum * realDenom + imagNum * imagDenom;
		this.imag = imagNum * realDenom - realNum * imagDenom;
	}
	
	public magnitude(): number {
		return Math.sqrt(this.real * this.real + this.imag * this.imag) / this.denom;
	}
	
	public angle(): number {
		return Math.atan2(this.imag, this.real);
	}
}

export class DynamicBiquadFilter {
	public a1: number = 0.0;
	public a2: number = 0.0;
	public b0: number = 1.0;
	public b1: number = 0.0;
	public b2: number = 0.0;
	public a1Delta: number = 0.0;
	public a2Delta: number = 0.0;
	public b0Delta: number = 0.0;
	public b1Delta: number = 0.0;
	public b2Delta: number = 0.0;
	public output1: number = 0.0;
	public output2: number = 0.0;
	
	// Some filter types are more stable when interpolating between coefficients
	// if the "b" coefficient interpolation is multiplicative. Don't enable this
	// for filter types where the "b" coefficients might change sign!
	public useMultiplicativeInputCoefficients: boolean = false;
	
	public resetOutput(): void {
		this.output1 = 0.0;
		this.output2 = 0.0;
	}
	
	public loadCoefficientsWithGradient(start: FilterCoefficients, end: FilterCoefficients, deltaRate: number, useMultiplicativeInputCoefficients: boolean): void {
		if (start.order != 2 || end.order != 2) throw new Error();
		this.a1 = start.a[1];
		this.a2 = start.a[2];
		this.b0 = start.b[0];
		this.b1 = start.b[1];
		this.b2 = start.b[2];
		this.a1Delta = (end.a[1] - start.a[1]) * deltaRate;
		this.a2Delta = (end.a[2] - start.a[2]) * deltaRate;
		if (useMultiplicativeInputCoefficients) {
			this.b0Delta = Math.pow(end.b[0] / start.b[0], deltaRate);
			this.b1Delta = Math.pow(end.b[1] / start.b[1], deltaRate);
			this.b2Delta = Math.pow(end.b[2] / start.b[2], deltaRate);
		} else {
			this.b0Delta = (end.b[0] - start.b[0]) * deltaRate;
			this.b1Delta = (end.b[1] - start.b[1]) * deltaRate;
			this.b2Delta = (end.b[2] - start.b[2]) * deltaRate;
		}
		this.useMultiplicativeInputCoefficients = useMultiplicativeInputCoefficients;
	}
}
